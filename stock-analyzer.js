(() => {
  const symbolInput = document.getElementById("stockSymbol");
  const symbolList = document.getElementById("stockSymbolList");
  const analyzeBtn = document.getElementById("analyzeStockBtn");
  const statusEl = document.getElementById("stockStatus");
  const resultEl = document.getElementById("stockResult");
  const nameEl = document.getElementById("stockName");
  const badgeEl = document.getElementById("stockSymbolBadge");
  const discussionLink = document.getElementById("discussionLink");
  const priceEl = document.getElementById("stockCurrentPrice");
  const dateEl = document.getElementById("stockCurrentDate");
  const periodGrid = document.getElementById("periodGrid");
  const rangeToggle = document.getElementById("chartRangeToggle");
  const chartModeHint = document.getElementById("chartModeHint");
  const compareInput = document.getElementById("compareSymbolInput");
  const addCompareBtn = document.getElementById("addCompareBtn");
  const compareChipsEl = document.getElementById("compareChips");
  const canvas = document.getElementById("stockChart");

  if (!analyzeBtn || !window.StockData) return;

  const PERIODS = [
    { label: "1주", days: 7 },
    { label: "1개월", days: 30 },
    { label: "3개월", days: 91 },
    { label: "6개월", days: 182 },
    { label: "1년", days: 365 },
    { label: "3년", days: 1095 },
    { label: "5년", days: 1825 },
  ];
  const CHART_COLORS = ["#16643f", "#e07a3f", "#3b82f6", "#a855f7", "#eab308"];
  const MAX_COMPARE = 4;

  let currentData = null;
  let currentDays = 365;
  let chartInstance = null;
  let compareSymbols = [];
  const compareCache = new Map();

  // The datalist offers every symbol from the real market-data universe
  // (200-ish real KOSPI/KOSDAQ/NASDAQ/NYSE tickers) so analysis/backtest/
  // infinite-buy aren't limited to the small curated recommendation list —
  // any of them can still be typed by hand since fetchYahooChart accepts
  // arbitrary real tickers.
  const datalistSource = window.MarketData
    ? window.MarketData.getUniverse().map((s) => ({ symbol: s.symbol, label: s.name }))
    : window.StockData.CURATED_STOCKS.map((s) => ({ symbol: s.symbol, label: s.nameKo }));

  datalistSource.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.symbol;
    opt.label = s.label + " (" + s.symbol + ")";
    opt.textContent = opt.label;
    symbolList.appendChild(opt);
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function resolveSymbolFromInput(raw) {
    const value = raw.trim();
    if (!value) return null;
    const byCurated = window.StockData.CURATED_STOCKS.find(
      (s) => s.nameKo === value || s.symbol.toLowerCase() === value.toLowerCase()
    );
    if (byCurated) return byCurated.symbol;
    const byUniverse = window.MarketData?.getUniverse().find(
      (s) => s.name === value || s.symbol.toLowerCase() === value.toLowerCase()
    );
    return byUniverse ? byUniverse.symbol : value;
  }

  function setDiscussionLink(symbol) {
    const isKorean = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
    if (isKorean) {
      const code = symbol.split(".")[0];
      discussionLink.href = "https://finance.naver.com/item/board.naver?code=" + encodeURIComponent(code);
      discussionLink.textContent = "💬 네이버 종목토론실 보기";
    } else {
      discussionLink.href = "https://finance.yahoo.com/quote/" + encodeURIComponent(symbol) + "/community/";
      discussionLink.textContent = "💬 Yahoo Finance 커뮤니티 보기";
    }
    discussionLink.hidden = false;
  }

  async function ensureCompareData(symbol) {
    if (compareCache.has(symbol)) return compareCache.get(symbol);
    const data = await window.StockData.fetchYahooChart(symbol, "5y", "1d");
    compareCache.set(symbol, data);
    return data;
  }

  function renderChips() {
    compareChipsEl.innerHTML = compareSymbols
      .map(
        (s) =>
          `<span class="compare-chip">${escapeHtml(s)}<button type="button" data-symbol="${escapeHtml(s)}" aria-label="비교 삭제">✕</button></span>`
      )
      .join("");
  }

  function normalize(points) {
    if (!points.length) return [];
    const base = points[0].close;
    return points.map((p) => ((p.close - base) / base) * 100);
  }

  async function renderChartForDays(days) {
    if (!currentData) return;
    currentDays = days;
    const latest = currentData.series[currentData.series.length - 1];
    const from = new Date(latest.date.getTime() - days * 86400000);
    const mainPoints = currentData.series.filter((p) => p.date >= from);

    if (chartInstance) chartInstance.destroy();

    if (!compareSymbols.length) {
      chartModeHint.textContent = "";
      chartInstance = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: mainPoints.map((p) => p.date.toISOString().slice(0, 10)),
          datasets: [
            {
              label: currentData.name,
              data: mainPoints.map((p) => p.close),
              borderColor: CHART_COLORS[0],
              backgroundColor: "rgba(22, 100, 63, 0.08)",
              fill: true,
              pointRadius: 0,
              borderWidth: 2,
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (ctx) => window.StockData.formatPrice(ctx.parsed.y, currentData.currency) },
            },
          },
          scales: {
            x: { ticks: { maxTicksLimit: 8 } },
            y: { ticks: { callback: (v) => window.StockData.formatPrice(v, currentData.currency) } },
          },
        },
      });
      return;
    }

    chartModeHint.textContent =
      "여러 종목은 통화·가격대가 달라 그래프 시작일 대비 변화율(%)로 환산해 비교합니다.";

    const compareResults = await Promise.all(
      compareSymbols.map((s) => ensureCompareData(s).catch(() => null))
    );

    const datasets = [
      {
        label: currentData.name,
        data: normalize(mainPoints),
        borderColor: CHART_COLORS[0],
      },
    ];

    compareResults.forEach((data, i) => {
      if (!data) return;
      const points = data.series.filter((p) => p.date >= from);
      datasets.push({
        label: data.name,
        data: normalize(points),
        borderColor: CHART_COLORS[(i + 1) % CHART_COLORS.length],
      });
    });

    chartInstance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: mainPoints.map((p) => p.date.toISOString().slice(0, 10)),
        datasets: datasets.map((d) => ({
          ...d,
          backgroundColor: "transparent",
          fill: false,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.15,
        })),
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true, position: "bottom", labels: { usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? "+" : ""}${ctx.parsed.y.toFixed(2)}%`,
            },
          },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8 } },
          y: { ticks: { callback: (v) => v + "%" } },
        },
      },
    });
  }

  function setActiveRangeButton(days) {
    rangeToggle.querySelectorAll(".range-btn").forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.days) === days);
    });
  }

  rangeToggle?.addEventListener("click", (e) => {
    const btn = e.target.closest(".range-btn");
    if (!btn) return;
    const days = Number(btn.dataset.days);
    setActiveRangeButton(days);
    renderChartForDays(days);
  });

  addCompareBtn.addEventListener("click", async () => {
    const symbol = resolveSymbolFromInput(compareInput.value);
    if (!symbol || !currentData) return;
    if (symbol === currentData.symbol || compareSymbols.includes(symbol)) {
      compareInput.value = "";
      return;
    }
    if (compareSymbols.length >= MAX_COMPARE) {
      alert("비교 종목은 최대 " + MAX_COMPARE + "개까지 추가할 수 있습니다.");
      return;
    }
    addCompareBtn.disabled = true;
    try {
      await ensureCompareData(symbol);
      compareSymbols.push(symbol);
      compareInput.value = "";
      renderChips();
      renderChartForDays(currentDays);
    } catch {
      alert("존재하지 않는 종목 코드이거나 시세를 확인할 수 없습니다: " + symbol);
    } finally {
      addCompareBtn.disabled = false;
    }
  });

  compareInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCompareBtn.click();
    }
  });

  compareChipsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-symbol]");
    if (!btn) return;
    compareSymbols = compareSymbols.filter((s) => s !== btn.dataset.symbol);
    renderChips();
    renderChartForDays(currentDays);
  });

  async function analyze() {
    const symbol = (symbolInput.value || "").trim();
    if (!symbol) {
      statusEl.textContent = "종목 코드를 입력해주세요.";
      return;
    }

    analyzeBtn.disabled = true;
    resultEl.hidden = true;
    statusEl.textContent = "데이터를 불러오는 중...";

    try {
      const data = await window.StockData.fetchYahooChart(symbol, "5y", "1d");
      if (!data.series.length) throw new Error("가격 데이터가 없습니다.");
      currentData = data;
      compareSymbols = [];
      renderChips();

      const latest = data.series[data.series.length - 1];
      nameEl.textContent = data.name;
      badgeEl.textContent = data.symbol;
      priceEl.textContent = window.StockData.formatPrice(latest.close, data.currency);
      dateEl.textContent = "기준일: " + latest.date.toISOString().slice(0, 10);
      setDiscussionLink(data.symbol);

      periodGrid.innerHTML = PERIODS.map((p) => {
        const change = window.StockData.periodChange(data.series, p.days);
        if (!change) {
          return `<div class="period-card"><span class="period-label">${p.label}</span><span class="period-value">데이터 없음</span></div>`;
        }
        const dir = change.changePct > 0 ? "up" : change.changePct < 0 ? "down" : "";
        return `<div class="period-card"><span class="period-label">${p.label}</span><span class="period-value ${dir}">${window.StockData.formatPercent(change.changePct)}</span></div>`;
      }).join("");

      setActiveRangeButton(365);
      renderChartForDays(365);

      resultEl.hidden = false;
      statusEl.textContent = "";
    } catch (err) {
      statusEl.textContent = err.message || "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
    } finally {
      analyzeBtn.disabled = false;
    }
  }

  analyzeBtn.addEventListener("click", analyze);

  window.StockAnalyzer = {
    analyzeSymbol(symbol) {
      symbolInput.value = symbol;
      document.getElementById("stock-analysis")?.scrollIntoView({ behavior: "smooth", block: "start" });
      analyze();
    },
  };
})();
