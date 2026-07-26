window.MarketDetail = (() => {
  const panel = document.getElementById("marketDetailPanel");
  if (!panel || !window.MarketData || !window.StockData || typeof Chart === "undefined") {
    return { show() {}, hide() {} };
  }

  const nameEl = document.getElementById("marketDetailName");
  const badgeEl = document.getElementById("marketDetailBadge");
  const priceEl = document.getElementById("marketDetailPrice");
  const changeEl = document.getElementById("marketDetailChange");
  const metricsEl = document.getElementById("marketDetailMetrics");
  const closeBtn = document.getElementById("marketDetailCloseBtn");
  const canvas = document.getElementById("marketDetailChart");

  const MAX_POINTS = 80;
  const PIN_REFRESH_MS = 15000;

  let currentSymbol = null;
  let chartInstance = null;
  let priceHistory = [];
  let unsubscribe = null;
  let pinTimer = null;
  let chartRequestId = 0;

  function fmtPrice(v, currency) {
    if (v == null) return "-";
    if (currency === "KRW") return Math.round(v).toLocaleString("ko-KR") + "원";
    return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(pct) {
    if (pct == null) return "-";
    const sign = pct > 0 ? "+" : "";
    return sign + pct.toFixed(2) + "%";
  }

  function dirClass(v) {
    return v > 0 ? "up" : v < 0 ? "down" : "";
  }

  function renderHeader(stock) {
    nameEl.textContent = stock.name;
    badgeEl.textContent = stock.symbol;
    if (stock.price == null) {
      priceEl.textContent = "시세를 불러오는 중...";
      changeEl.textContent = stock.error ? "실시간 시세를 가져오지 못했습니다: " + stock.error : "";
      changeEl.className = "period-value mono";
      return;
    }
    priceEl.textContent = fmtPrice(stock.price, stock.currency);
    changeEl.textContent =
      (stock.changeAmt >= 0 ? "+" : "") + fmtPrice(stock.changeAmt, stock.currency) + " (" + fmtPct(stock.changePct) + ")";
    changeEl.className = "period-value mono " + dirClass(stock.changePct);
  }

  // All six tiles come straight from the real Yahoo Finance quote — no
  // approximated PER/PBR/market-cap figures that could drift from reality.
  function renderMetrics(stock) {
    metricsEl.innerHTML = `
      <div class="stat-box"><span class="stat-num mono">${fmtPrice(stock.prevClose, stock.currency)}</span><span class="stat-label">전일종가</span></div>
      <div class="stat-box"><span class="stat-num mono">${fmtPrice(stock.dayHigh, stock.currency)}</span><span class="stat-label">일중 고가</span></div>
      <div class="stat-box"><span class="stat-num mono">${fmtPrice(stock.dayLow, stock.currency)}</span><span class="stat-label">일중 저가</span></div>
      <div class="stat-box"><span class="stat-num mono">${stock.volume != null ? Math.round(stock.volume).toLocaleString("ko-KR") : "-"}</span><span class="stat-label">거래량</span></div>
      <div class="stat-box"><span class="stat-num mono">${fmtPrice(stock.weekHigh52, stock.currency)}</span><span class="stat-label">52주 최고</span></div>
      <div class="stat-box"><span class="stat-num mono">${fmtPrice(stock.weekLow52, stock.currency)}</span><span class="stat-label">52주 최저</span></div>
    `;
  }

  function drawChart(currency) {
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: priceHistory.map((_, i) => i),
        datasets: [
          {
            data: priceHistory,
            borderColor: "#34d399",
            backgroundColor: "rgba(52, 211, 153, 0.1)",
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => fmtPrice(ctx.parsed.y, currency) } },
        },
        scales: {
          x: { display: false },
          y: { ticks: { callback: (v) => fmtPrice(v, currency), color: "#8b93a3" }, grid: { color: "#262b38" } },
        },
      },
    });
  }

  // Pulls a real short-term price series from Yahoo Finance (via the same
  // proxy layer stock-analysis/backtest use) instead of fabricating a
  // backfill locally. StockData caches chart responses for 15 minutes, so
  // re-calling this on every pin refresh doesn't add extra network load.
  async function loadChart(stock) {
    const requestId = ++chartRequestId;
    try {
      const chart = await window.StockData.fetchYahooChart(stock.symbol, "5d", "15m");
      if (requestId !== chartRequestId) return;
      let series = chart.series;
      if (!series.length) throw new Error("no intraday series");
      priceHistory = series.slice(-MAX_POINTS).map((p) => p.close);
    } catch {
      try {
        const chart = await window.StockData.fetchYahooChart(stock.symbol, "3mo", "1d");
        if (requestId !== chartRequestId) return;
        priceHistory = chart.series.slice(-MAX_POINTS).map((p) => p.close);
      } catch {
        if (requestId !== chartRequestId) return;
        priceHistory = stock.price != null ? [stock.price] : [];
      }
    }
    if (requestId !== chartRequestId) return;
    drawChart(stock.currency);
  }

  function refreshFromStore() {
    const stock = window.MarketData.getStock(currentSymbol);
    if (!stock) return;
    renderHeader(stock);
    renderMetrics(stock);
  }

  function show(symbol) {
    const stock = window.MarketData.getStock(symbol);
    if (!stock) return;
    currentSymbol = symbol;

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });

    renderHeader(stock);
    renderMetrics(stock);
    loadChart(stock);

    if (unsubscribe) unsubscribe();
    unsubscribe = window.MarketData.subscribe(({ changedSymbols }) => {
      if (!changedSymbols.includes(currentSymbol)) return;
      refreshFromStore();
    });

    // Keep this symbol's quote fresh even if the user scrolls the table
    // away from its row (which would otherwise stop it being "visible").
    if (pinTimer) clearInterval(pinTimer);
    pinTimer = setInterval(() => {
      if (!currentSymbol) return;
      window.MarketData.refreshSymbols([currentSymbol]);
      const s = window.MarketData.getStock(currentSymbol);
      if (s) loadChart(s);
    }, PIN_REFRESH_MS);

    window.MarketData.refreshSymbols([symbol]);
  }

  function hide() {
    panel.hidden = true;
    currentSymbol = null;
    chartRequestId++;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (pinTimer) {
      clearInterval(pinTimer);
      pinTimer = null;
    }
  }

  closeBtn.addEventListener("click", hide);

  return { show, hide };
})();
