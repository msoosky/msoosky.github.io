(() => {
  const symbolInput = document.getElementById("stockSymbol");
  const symbolList = document.getElementById("stockSymbolList");
  const analyzeBtn = document.getElementById("analyzeStockBtn");
  const statusEl = document.getElementById("stockStatus");
  const resultEl = document.getElementById("stockResult");
  const nameEl = document.getElementById("stockName");
  const badgeEl = document.getElementById("stockSymbolBadge");
  const priceEl = document.getElementById("stockCurrentPrice");
  const dateEl = document.getElementById("stockCurrentDate");
  const periodGrid = document.getElementById("periodGrid");
  const rangeToggle = document.getElementById("chartRangeToggle");
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

  let currentData = null;
  let chartInstance = null;

  window.StockData.CURATED_STOCKS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.symbol;
    opt.label = s.nameKo + " (" + s.symbol + ")";
    opt.textContent = opt.label;
    symbolList.appendChild(opt);
  });

  function renderChartForDays(days) {
    if (!currentData) return;
    const latest = currentData.series[currentData.series.length - 1];
    const from = new Date(latest.date.getTime() - days * 86400000);
    const points = currentData.series.filter((p) => p.date >= from);

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: points.map((p) => p.date.toISOString().slice(0, 10)),
        datasets: [
          {
            label: currentData.name,
            data: points.map((p) => p.close),
            borderColor: "#16643f",
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
            callbacks: {
              label: (ctx) => window.StockData.formatPrice(ctx.parsed.y, currentData.currency),
            },
          },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8 } },
          y: { ticks: { callback: (v) => window.StockData.formatPrice(v, currentData.currency) } },
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

      const latest = data.series[data.series.length - 1];
      nameEl.textContent = data.name;
      badgeEl.textContent = data.symbol;
      priceEl.textContent = window.StockData.formatPrice(latest.close, data.currency);
      dateEl.textContent = "기준일: " + latest.date.toISOString().slice(0, 10);

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
