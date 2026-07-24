window.MarketDetail = (() => {
  const panel = document.getElementById("marketDetailPanel");
  if (!panel || !window.MarketMock || typeof Chart === "undefined") {
    return { show() {}, hide() {} };
  }

  const nameEl = document.getElementById("marketDetailName");
  const badgeEl = document.getElementById("marketDetailBadge");
  const priceEl = document.getElementById("marketDetailPrice");
  const changeEl = document.getElementById("marketDetailChange");
  const metricsEl = document.getElementById("marketDetailMetrics");
  const orderBookEl = document.getElementById("marketOrderBook");
  const closeBtn = document.getElementById("marketDetailCloseBtn");
  const canvas = document.getElementById("marketDetailChart");

  const MAX_POINTS = 60;

  let currentSymbol = null;
  let chartInstance = null;
  let priceHistory = [];
  let unsubscribe = null;

  function fmtPrice(v, currency) {
    if (v == null) return "-";
    if (currency === "KRW") return Math.round(v).toLocaleString("ko-KR") + "원";
    return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(pct) {
    const sign = pct > 0 ? "+" : "";
    return sign + pct.toFixed(2) + "%";
  }

  function fmtMarketCap(value, currency) {
    if (currency === "KRW") {
      if (value >= 1e12) return (value / 1e12).toFixed(1) + "조원";
      return (value / 1e8).toFixed(0) + "억원";
    }
    if (value >= 1e12) return "$" + (value / 1e12).toFixed(2) + "T";
    return "$" + (value / 1e9).toFixed(1) + "B";
  }

  function dirClass(v) {
    return v > 0 ? "up" : v < 0 ? "down" : "";
  }

  function generateBackfill(stock, count) {
    const points = [stock.price];
    let p = stock.price;
    for (let i = 1; i < count; i++) {
      p = p / (1 + (Math.random() - 0.5) * 0.006);
      points.unshift(Math.round(p * 100) / 100);
    }
    return points;
  }

  function renderHeader(stock) {
    nameEl.textContent = stock.name;
    badgeEl.textContent = stock.symbol;
    priceEl.textContent = fmtPrice(stock.price, stock.currency);
    changeEl.textContent =
      (stock.changeAmt >= 0 ? "+" : "") + fmtPrice(stock.changeAmt, stock.currency) + " (" + fmtPct(stock.changePct) + ")";
    changeEl.className = "period-value mono " + dirClass(stock.changePct);
  }

  function renderMetrics(stock) {
    const marketCap = stock.price * stock.sharesOutstanding;
    metricsEl.innerHTML = `
      <div class="stat-box"><span class="stat-num mono">${stock.per > 0 ? stock.per.toFixed(1) : "적자"}</span><span class="stat-label">PER</span></div>
      <div class="stat-box"><span class="stat-num mono">${stock.pbr > 0 ? stock.pbr.toFixed(2) : "N/A"}</span><span class="stat-label">PBR</span></div>
      <div class="stat-box"><span class="stat-num mono">${stock.dividendYield.toFixed(2)}%</span><span class="stat-label">배당수익률</span></div>
      <div class="stat-box"><span class="stat-num mono">${fmtMarketCap(marketCap, stock.currency)}</span><span class="stat-label">시가총액 (모의)</span></div>
    `;
  }

  function renderOrderBook(stock) {
    const { bids, asks } = window.MarketMock.getOrderBook(stock.symbol, 8);
    const askRows = [...asks]
      .reverse()
      .map(
        (l) =>
          `<div class="orderbook-row ask"><span class="ob-price mono">${fmtPrice(l.price, stock.currency)}</span><span class="ob-qty mono">${l.qty.toLocaleString("ko-KR")}</span></div>`
      )
      .join("");
    const bidRows = bids
      .map(
        (l) =>
          `<div class="orderbook-row bid"><span class="ob-price mono">${fmtPrice(l.price, stock.currency)}</span><span class="ob-qty mono">${l.qty.toLocaleString("ko-KR")}</span></div>`
      )
      .join("");
    orderBookEl.innerHTML =
      askRows + `<div class="orderbook-mid mono">${fmtPrice(stock.price, stock.currency)}</div>` + bidRows;
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

  function updateChart() {
    if (!chartInstance) return;
    chartInstance.data.labels = priceHistory.map((_, i) => i);
    chartInstance.data.datasets[0].data = priceHistory;
    chartInstance.update("none");
  }

  function show(symbol) {
    const stock = window.MarketMock.getStock(symbol);
    if (!stock) return;
    currentSymbol = symbol;

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });

    renderHeader(stock);
    renderMetrics(stock);
    renderOrderBook(stock);

    priceHistory = generateBackfill(stock, MAX_POINTS);
    drawChart(stock.currency);

    if (unsubscribe) unsubscribe();
    unsubscribe = window.MarketMock.subscribe(({ changedSymbols }) => {
      if (!changedSymbols.includes(currentSymbol)) return;
      const s = window.MarketMock.getStock(currentSymbol);
      renderHeader(s);
      renderMetrics(s);
      renderOrderBook(s);
      priceHistory.push(s.price);
      if (priceHistory.length > MAX_POINTS) priceHistory.shift();
      updateChart();
    });
  }

  function hide() {
    panel.hidden = true;
    currentSymbol = null;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  closeBtn.addEventListener("click", hide);

  return { show, hide };
})();
