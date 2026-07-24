window.DetailPanel = (() => {
  const panel = document.getElementById("detailPanel");
  if (!panel || !window.StockData || typeof Chart === "undefined") {
    return { show() {}, hide() {} };
  }

  const nameEl = document.getElementById("detailName");
  const priceEl = document.getElementById("detailPrice");
  const changeBadgeEl = document.getElementById("detailChangeBadge");
  const statusEl = document.getElementById("detailStatus");
  const statsEl = document.getElementById("detailStats");
  const rangeToggle = document.getElementById("detailRangeToggle");
  const closeBtn = document.getElementById("detailCloseBtn");
  const canvas = document.getElementById("detailChart");

  const RANGE_MAP = {
    "1d": { range: "1d", interval: "5m" },
    "1w": { range: "5d", interval: "15m" },
    "1mo": { range: "1mo", interval: "1d" },
    "1y": { range: "1y", interval: "1d" },
  };

  let chartInstance = null;
  let currentSymbol = null;
  let currentRangeKey = "1d";

  function hide() {
    panel.hidden = true;
    currentSymbol = null;
  }

  function show(symbol) {
    currentSymbol = symbol;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setActiveRangeButton(currentRangeKey);
    loadAll(symbol);
  }

  function setActiveRangeButton(key) {
    rangeToggle.querySelectorAll(".range-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.range === key);
    });
  }

  async function loadAll(symbol) {
    nameEl.textContent = symbol;
    priceEl.textContent = "불러오는 중...";
    changeBadgeEl.textContent = "";
    changeBadgeEl.className = "period-value";
    statsEl.innerHTML = "";
    statusEl.textContent = "";

    const [quoteResult] = await Promise.allSettled([window.StockData.fetchQuote(symbol)]);
    if (currentSymbol !== symbol) return;

    if (quoteResult.status === "fulfilled") {
      renderQuote(quoteResult.value);
    } else {
      priceEl.textContent = "-";
      statusEl.textContent = quoteResult.reason?.message || "시세를 불러오지 못했습니다.";
    }

    await loadChart(symbol, currentRangeKey);
  }

  function renderQuote(q) {
    nameEl.textContent = q.name;
    priceEl.textContent = window.StockData.formatPrice(q.price, q.currency);
    const dir = q.changePct > 0 ? "up" : q.changePct < 0 ? "down" : "";
    changeBadgeEl.textContent =
      window.StockData.formatPercent(q.changePct) +
      (q.changeAmt != null ? ` (${window.StockData.formatPrice(Math.abs(q.changeAmt), q.currency)})` : "");
    changeBadgeEl.className = "period-value " + dir;

    statsEl.innerHTML = `
      <div class="stat-box"><span class="stat-num">${q.volume != null ? q.volume.toLocaleString("ko-KR") : "-"}</span><span class="stat-label">거래량</span></div>
      <div class="stat-box"><span class="stat-num">${window.StockData.formatPrice(q.dayHigh, q.currency)}</span><span class="stat-label">당일 고가</span></div>
      <div class="stat-box"><span class="stat-num">${window.StockData.formatPrice(q.weekHigh52, q.currency)}</span><span class="stat-label">52주 최고</span></div>
      <div class="stat-box"><span class="stat-num">${window.StockData.formatPrice(q.weekLow52, q.currency)}</span><span class="stat-label">52주 최저</span></div>
    `;
  }

  async function loadChart(symbol, rangeKey) {
    const conf = RANGE_MAP[rangeKey];
    try {
      const data = await window.StockData.fetchYahooChart(symbol, conf.range, conf.interval);
      if (currentSymbol !== symbol) return;
      if (!data.series.length) {
        statusEl.textContent = "해당 기간의 데이터가 없습니다.";
        if (chartInstance) chartInstance.destroy();
        return;
      }
      drawChart(data);
    } catch (err) {
      if (currentSymbol !== symbol) return;
      statusEl.textContent = err.message || "차트를 불러오지 못했습니다.";
    }
  }

  function drawChart(data) {
    const isIntraday = data.series.length && data.series[0].date.toDateString() === data.series[data.series.length - 1].date.toDateString();
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: data.series.map((p) =>
          isIntraday
            ? p.date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
            : p.date.toISOString().slice(0, 10)
        ),
        datasets: [
          {
            label: data.name,
            data: data.series.map((p) => p.close),
            borderColor: "#34d399",
            backgroundColor: "rgba(52, 211, 153, 0.12)",
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
            callbacks: { label: (ctx) => window.StockData.formatPrice(ctx.parsed.y, data.currency) },
          },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: "#8b93a3" }, grid: { color: "#262b38" } },
          y: {
            ticks: { callback: (v) => window.StockData.formatPrice(v, data.currency), color: "#8b93a3" },
            grid: { color: "#262b38" },
          },
        },
      },
    });
  }

  rangeToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".range-btn");
    if (!btn || !currentSymbol) return;
    currentRangeKey = btn.dataset.range;
    setActiveRangeButton(currentRangeKey);
    statusEl.textContent = "";
    loadChart(currentSymbol, currentRangeKey);
  });

  closeBtn.addEventListener("click", hide);

  return { show, hide };
})();
