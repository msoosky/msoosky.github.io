(() => {
  const symbolInput = document.getElementById("btSymbol");
  const methodSelect = document.getElementById("btMethod");
  const startInput = document.getElementById("btStartDate");
  const endInput = document.getElementById("btEndDate");
  const amountInput = document.getElementById("btAmount");
  const amountLabel = document.getElementById("btAmountLabel");
  const runBtn = document.getElementById("runBacktestBtn");
  const statusEl = document.getElementById("backtestStatus");
  const resultEl = document.getElementById("backtestResult");
  const summaryEl = document.getElementById("backtestSummary");
  const summary2El = document.getElementById("backtestSummary2");
  const detailEl = document.getElementById("backtestDetail");
  const canvas = document.getElementById("backtestChart");

  if (!runBtn || !window.StockData || typeof Chart === "undefined") return;

  let chartInstance = null;

  (function setDefaultDates() {
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 3);
    endInput.value = end.toISOString().slice(0, 10);
    startInput.value = start.toISOString().slice(0, 10);
  })();

  methodSelect.addEventListener("change", () => {
    amountLabel.firstChild.textContent =
      methodSelect.value === "dca" ? "월 적립금 (만원)" : "투자 금액 (만원)";
  });

  function pickRange(startDate) {
    const days = (Date.now() - startDate.getTime()) / 86400000;
    if (days <= 360) return "1y";
    if (days <= 720) return "2y";
    if (days <= 1800) return "5y";
    if (days <= 3600) return "10y";
    return "max";
  }

  function addMonths(date, n) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    return d;
  }

  function stdev(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  function calcXIRR(cashflows) {
    const t0 = cashflows[0].date.getTime();
    function npv(rate) {
      return cashflows.reduce((sum, cf) => {
        const days = (cf.date.getTime() - t0) / 86400000;
        return sum + cf.amount / Math.pow(1 + rate, days / 365);
      }, 0);
    }
    let lo = -0.99;
    let hi = 10;
    let loVal = npv(lo);
    let hiVal = npv(hi);
    if (loVal * hiVal > 0) return null;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      const midVal = npv(mid);
      if (Math.abs(midVal) < 1e-6) return mid;
      if ((midVal > 0) === (loVal > 0)) {
        lo = mid;
        loVal = midVal;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) / 2;
  }

  function computeMDD(valueSeries) {
    let peak = -Infinity;
    let mdd = 0;
    for (const v of valueSeries) {
      if (v > peak) peak = v;
      if (peak > 0) {
        const dd = (v - peak) / peak;
        if (dd < mdd) mdd = dd;
      }
    }
    return mdd * 100;
  }

  function computeVolatility(series, start, end) {
    const inRange = series.filter((p) => p.date >= start && p.date <= end);
    if (inRange.length < 3) return null;
    const returns = [];
    for (let i = 1; i < inRange.length; i++) {
      returns.push((inRange[i].close - inRange[i - 1].close) / inRange[i - 1].close);
    }
    return stdev(returns) * Math.sqrt(252) * 100;
  }

  async function runBacktest() {
    const symbol = (symbolInput.value || "").trim();
    const method = methodSelect.value;
    const startDate = new Date(startInput.value);
    const endDate = new Date(endInput.value);
    const amountManwon = Number(amountInput.value) || 0;

    if (!symbol) {
      statusEl.textContent = "종목 코드를 입력해주세요.";
      return;
    }
    if (!(startDate < endDate)) {
      statusEl.textContent = "종료일은 시작일보다 이후여야 합니다.";
      return;
    }
    if (amountManwon <= 0) {
      statusEl.textContent = "투자 금액을 입력해주세요.";
      return;
    }

    runBtn.disabled = true;
    resultEl.hidden = true;
    statusEl.textContent = "과거 시세 데이터를 불러오는 중...";

    try {
      const range = pickRange(startDate);
      const data = await window.StockData.fetchYahooChart(symbol, range, "1d");
      const series = data.series;
      if (!series.length) throw new Error("가격 데이터가 없습니다.");
      if (series[0].date > startDate) {
        throw new Error(
          "선택한 시작일(" + startInput.value + ")보다 상장/데이터 시작일이 늦습니다. 시작일을 더 최근으로 조정해주세요."
        );
      }

      const amount = amountManwon * 10000;
      let cashflows = [];
      let purchases = [];
      let totalShares = 0;
      let totalInvested = 0;

      if (method === "lump") {
        const buyPoint = window.StockData.nearestOnOrAfter(series, startDate);
        if (!buyPoint) throw new Error("시작일 이후 거래 데이터를 찾을 수 없습니다.");
        totalShares = amount / buyPoint.close;
        totalInvested = amount;
        purchases.push({ date: buyPoint.date, price: buyPoint.close, invested: amount, shares: totalShares });
        cashflows.push({ date: buyPoint.date, amount: -amount });
      } else {
        let cursor = new Date(startDate);
        while (cursor <= endDate) {
          const buyPoint = window.StockData.nearestOnOrAfter(series, cursor);
          if (buyPoint && buyPoint.date <= endDate) {
            const shares = amount / buyPoint.close;
            totalShares += shares;
            totalInvested += amount;
            purchases.push({ date: buyPoint.date, price: buyPoint.close, invested: amount, shares });
            cashflows.push({ date: buyPoint.date, amount: -amount });
          }
          cursor = addMonths(cursor, 1);
        }
        if (!purchases.length) throw new Error("해당 기간에 매수 가능한 거래일이 없습니다.");
      }

      const endPoint = window.StockData.nearestOnOrBefore(series, endDate);
      if (!endPoint) throw new Error("종료일 기준 시세를 찾을 수 없습니다.");
      const finalValue = totalShares * endPoint.close;
      cashflows.push({ date: endPoint.date, amount: finalValue });

      const totalReturnPct = ((finalValue - totalInvested) / totalInvested) * 100;
      const heldDays = (endPoint.date - purchases[0].date) / 86400000;
      const simpleCagr =
        heldDays > 0 ? (Math.pow(finalValue / totalInvested, 365 / heldDays) - 1) * 100 : null;
      const xirr = calcXIRR(cashflows);
      const annualizedReturn = method === "lump" ? simpleCagr : xirr !== null ? xirr * 100 : null;

      const valueTimeline = series.filter((p) => p.date >= purchases[0].date && p.date <= endPoint.date);
      const portfolioValues = [];
      let cumShares = 0;
      let purchaseIdx = 0;
      for (const point of valueTimeline) {
        while (purchaseIdx < purchases.length && purchases[purchaseIdx].date <= point.date) {
          cumShares += purchases[purchaseIdx].shares;
          purchaseIdx++;
        }
        portfolioValues.push(cumShares * point.close);
      }
      const mdd = computeMDD(portfolioValues);
      const volatility = computeVolatility(series, purchases[0].date, endPoint.date);

      const currency = data.currency;
      const fmt = (n) => window.StockData.formatPrice(n, currency);
      const fmtPct = (n) => (n == null ? "데이터 부족" : window.StockData.formatPercent(n));

      summaryEl.innerHTML = `
        <div class="stat-box"><span class="stat-num">${fmt(totalInvested)}</span><span class="stat-label">총 투자원금</span></div>
        <div class="stat-box"><span class="stat-num">${fmt(finalValue)}</span><span class="stat-label">최종 평가금액</span></div>
        <div class="stat-box"><span class="stat-num ${totalReturnPct >= 0 ? "up" : "down"}">${fmtPct(totalReturnPct)}</span><span class="stat-label">총 수익률</span></div>
        <div class="stat-box"><span class="stat-num ${(annualizedReturn ?? 0) >= 0 ? "up" : "down"}">${fmtPct(annualizedReturn)}</span><span class="stat-label">연환산 수익률</span></div>
      `;
      summary2El.innerHTML = `
        <div class="stat-box"><span class="stat-num down">${mdd.toFixed(2)}%</span><span class="stat-label">최대 낙폭(MDD)</span></div>
        <div class="stat-box"><span class="stat-num">${volatility != null ? volatility.toFixed(2) + "%" : "데이터 부족"}</span><span class="stat-label">연율화 변동성</span></div>
        <div class="stat-box"><span class="stat-num">${purchases.length}회</span><span class="stat-label">총 매수 횟수</span></div>
      `;

      if (chartInstance) chartInstance.destroy();
      const principalTimeline = [];
      let cumInvested = 0;
      purchaseIdx = 0;
      for (const point of valueTimeline) {
        while (purchaseIdx < purchases.length && purchases[purchaseIdx].date <= point.date) {
          cumInvested += purchases[purchaseIdx].invested;
          purchaseIdx++;
        }
        principalTimeline.push(cumInvested);
      }

      chartInstance = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: valueTimeline.map((p) => p.date.toISOString().slice(0, 10)),
          datasets: [
            {
              label: "누적 투자원금",
              data: principalTimeline,
              borderColor: "#9aa2b1",
              backgroundColor: "transparent",
              borderDash: [4, 4],
              pointRadius: 0,
              borderWidth: 1.5,
              tension: 0,
            },
            {
              label: "평가금액",
              data: portfolioValues,
              borderColor: "#16643f",
              backgroundColor: "rgba(22, 100, 63, 0.08)",
              fill: true,
              pointRadius: 0,
              borderWidth: 2,
              tension: 0.15,
            },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } },
          },
          scales: {
            x: { ticks: { maxTicksLimit: 8 } },
            y: { ticks: { callback: (v) => fmt(v) } },
          },
        },
      });

      detailEl.innerHTML = `
        <table>
          <thead><tr><th>매수일</th><th>매수 단가</th><th>투자금</th><th>매수 수량</th></tr></thead>
          <tbody>
            ${purchases
              .map(
                (p) =>
                  `<tr><td>${p.date.toISOString().slice(0, 10)}</td><td>${fmt(p.price)}</td><td>${fmt(p.invested)}</td><td>${p.shares.toFixed(4)}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      resultEl.hidden = false;
      statusEl.textContent = "";
    } catch (err) {
      statusEl.textContent = err.message || "백테스트를 실행하지 못했습니다.";
    } finally {
      runBtn.disabled = false;
    }
  }

  runBtn.addEventListener("click", runBacktest);

  window.Backtest = {
    runFor(symbol) {
      symbolInput.value = symbol;
      document.querySelector('.tab-btn[data-tab="backtest"]')?.click();
      document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth", block: "start" });
      runBacktest();
    },
  };
})();
