(() => {
  const symbolInput = document.getElementById("ibSymbol");
  const seedInput = document.getElementById("ibSeed");
  const roundsInput = document.getElementById("ibRounds");
  const targetReturnInput = document.getElementById("ibTargetReturn");
  const sellRatioInput = document.getElementById("ibSellRatio");
  const startInput = document.getElementById("ibStartDate");
  const endInput = document.getElementById("ibEndDate");
  const runBtn = document.getElementById("runInfiniteBuyBtn");
  const statusEl = document.getElementById("infiniteBuyStatus");
  const resultEl = document.getElementById("infiniteBuyResult");
  const summaryEl = document.getElementById("infiniteBuySummary");
  const summary2El = document.getElementById("infiniteBuySummary2");
  const detailEl = document.getElementById("infiniteBuyDetail");
  const canvas = document.getElementById("infiniteBuyChart");

  if (!runBtn || !window.StockData || typeof Chart === "undefined") return;

  let chartInstance = null;

  (function setDefaultDates() {
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 2);
    endInput.value = end.toISOString().slice(0, 10);
    startInput.value = start.toISOString().slice(0, 10);
  })();

  function pickRange(startDate) {
    const days = (Date.now() - startDate.getTime()) / 86400000;
    if (days <= 360) return "1y";
    if (days <= 720) return "2y";
    if (days <= 1800) return "5y";
    if (days <= 3600) return "10y";
    return "max";
  }

  async function runSimulation() {
    const symbol = (symbolInput.value || "").trim();
    const seedManwon = Number(seedInput.value) || 0;
    const rounds = Math.max(2, Math.floor(Number(roundsInput.value) || 40));
    const targetReturnPct = Number(targetReturnInput.value) || 10;
    const sellRatioPct = Math.min(100, Math.max(1, Number(sellRatioInput.value) || 25));
    const startDate = new Date(startInput.value);
    const endDate = new Date(endInput.value);

    if (!symbol) {
      statusEl.textContent = "종목 코드를 입력해주세요.";
      return;
    }
    if (!(startDate < endDate)) {
      statusEl.textContent = "종료일은 시작일보다 이후여야 합니다.";
      return;
    }
    if (seedManwon <= 0) {
      statusEl.textContent = "시드머니를 입력해주세요.";
      return;
    }

    runBtn.disabled = true;
    resultEl.hidden = true;
    statusEl.textContent = "과거 시세 데이터를 불러오는 중...";

    try {
      const range = pickRange(startDate);
      const data = await window.StockData.fetchYahooChart(symbol, range, "1d");
      const series = data.series.filter((p) => p.date >= startDate && p.date <= endDate);
      if (series.length < 2) {
        throw new Error("해당 기간의 데이터가 부족합니다. 기간을 조정해주세요.");
      }
      if (data.series[0].date > startDate) {
        throw new Error(
          "선택한 시작일보다 상장/데이터 시작일이 늦습니다. 시작일을 더 최근으로 조정해주세요."
        );
      }

      const currency = data.currency;
      let seedNative = seedManwon * 10000;
      let fxNote = "";
      if (currency !== "KRW") {
        const fx = await window.StockData.fetchQuote("KRW=X").catch(() => null);
        if (!fx) throw new Error("환율 정보를 불러오지 못해 시드머니를 환산할 수 없습니다.");
        seedNative = (seedManwon * 10000) / fx.price;
        fxNote = ` (환율 ${fx.price.toFixed(2)}원/달러 기준으로 환산)`;
      }

      const perRound = seedNative / rounds;
      let cash = seedNative;
      let shares = 0;
      let roundsUsed = 0;
      let totalInvested = 0;
      let realizedPnl = 0;
      const events = [];
      const timeline = [];

      series.forEach((point) => {
        const price = point.close;

        if (shares > 0) {
          const avgPrice = totalInvested / shares;
          const unrealizedPct = ((price - avgPrice) / avgPrice) * 100;
          if (unrealizedPct >= targetReturnPct) {
            const sellShares = shares * (sellRatioPct / 100);
            const proceeds = sellShares * price;
            const costBasis = sellShares * avgPrice;
            realizedPnl += proceeds - costBasis;
            cash += proceeds;
            shares -= sellShares;
            totalInvested -= costBasis;
            events.push({ date: point.date, type: "sell", price, amount: proceeds, shares: sellShares });
          }
        }

        if (roundsUsed < rounds && cash >= perRound) {
          const buyShares = perRound / price;
          shares += buyShares;
          cash -= perRound;
          totalInvested += perRound;
          roundsUsed += 1;
          events.push({ date: point.date, type: "buy", price, amount: perRound, shares: buyShares });
        }

        timeline.push({ date: point.date, value: cash + shares * price });
      });

      const finalPrice = series[series.length - 1].close;
      const finalValue = cash + shares * finalPrice;
      const totalReturnPct = ((finalValue - seedNative) / seedNative) * 100;
      const unrealizedPnl = shares * finalPrice - totalInvested;
      const buyCount = events.filter((e) => e.type === "buy").length;
      const sellCount = events.filter((e) => e.type === "sell").length;

      const fmt = (n) => window.StockData.formatPrice(n, currency);
      const fmtPct = (n) => window.StockData.formatPercent(n);

      summaryEl.innerHTML = `
        <div class="stat-box"><span class="stat-num">${fmt(seedNative)}</span><span class="stat-label">시드머니${fxNote ? " (환산)" : ""}</span></div>
        <div class="stat-box"><span class="stat-num">${fmt(finalValue)}</span><span class="stat-label">최종 평가금액</span></div>
        <div class="stat-box"><span class="stat-num ${totalReturnPct >= 0 ? "up" : "down"}">${fmtPct(totalReturnPct)}</span><span class="stat-label">총 수익률</span></div>
        <div class="stat-box"><span class="stat-num ${realizedPnl >= 0 ? "up" : "down"}">${fmt(realizedPnl)}</span><span class="stat-label">실현 손익</span></div>
      `;
      summary2El.innerHTML = `
        <div class="stat-box"><span class="stat-num ${unrealizedPnl >= 0 ? "up" : "down"}">${fmt(unrealizedPnl)}</span><span class="stat-label">미실현 손익</span></div>
        <div class="stat-box"><span class="stat-num">${roundsUsed} / ${rounds}회차</span><span class="stat-label">매수 진행 (매도 ${sellCount}회)</span></div>
        <div class="stat-box"><span class="stat-num">${fmt(cash)}</span><span class="stat-label">잔여 현금</span></div>
      `;

      if (chartInstance) chartInstance.destroy();
      chartInstance = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: timeline.map((p) => p.date.toISOString().slice(0, 10)),
          datasets: [
            {
              label: "평가금액 (현금+보유주식)",
              data: timeline.map((p) => p.value),
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
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => fmt(ctx.parsed.y) } },
          },
          scales: {
            x: { ticks: { maxTicksLimit: 8 } },
            y: { ticks: { callback: (v) => fmt(v) } },
          },
        },
      });

      detailEl.innerHTML = `
        <table>
          <thead><tr><th>날짜</th><th>구분</th><th>가격</th><th>금액</th><th>수량</th></tr></thead>
          <tbody>
            ${events
              .map(
                (e) =>
                  `<tr><td>${e.date.toISOString().slice(0, 10)}</td><td class="${e.type === "buy" ? "up" : "down"}">${e.type === "buy" ? "매수" : "매도"}</td><td>${fmt(e.price)}</td><td>${fmt(e.amount)}</td><td>${e.shares.toFixed(4)}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      resultEl.hidden = false;
      statusEl.textContent = "";
    } catch (err) {
      statusEl.textContent = err.message || "시뮬레이션을 실행하지 못했습니다.";
    } finally {
      runBtn.disabled = false;
    }
  }

  runBtn.addEventListener("click", runSimulation);
})();
