(() => {
  const indexRow = document.getElementById("indexTickerRow");
  const lastUpdatedEl = document.getElementById("lastUpdated");
  const refreshBtn = document.getElementById("refreshDashboardBtn");
  const totalValueEl = document.getElementById("assetTotalValue");
  const totalPnlEl = document.getElementById("assetTotalPnl");
  const totalReturnEl = document.getElementById("assetTotalReturn");
  const dailyPnlEl = document.getElementById("assetDailyPnl");

  if (!indexRow || !window.StockData || !window.Holdings || !window.Watchlist) return;

  const AUTO_REFRESH_MS = 60000;
  let refreshing = false;

  function formatIndexValue(v) {
    if (v == null) return "-";
    return v.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatKrw(v) {
    if (v == null || Number.isNaN(v)) return "-";
    const sign = v > 0 ? "+" : "";
    return sign + Math.round(v).toLocaleString("ko-KR") + "원";
  }

  async function renderIndexCards() {
    const symbols = window.StockData.MARKET_INDEXES.map((i) => i.symbol);
    const quotes = await window.StockData.fetchQuotesBatch(symbols);

    indexRow.innerHTML = window.StockData.MARKET_INDEXES.map(({ symbol, label }) => {
      const entry = quotes.get(symbol);
      if (!entry || entry.error) {
        return `
          <div class="market-card">
            <div class="market-name">${label}</div>
            <div class="market-value">-</div>
            <div class="market-change">데이터 없음</div>
          </div>`;
      }
      const q = entry.quote;
      const dir = q.changePct > 0 ? "up" : q.changePct < 0 ? "down" : "";
      const arrow = q.changePct > 0 ? "▲" : q.changePct < 0 ? "▼" : "-";
      return `
        <div class="market-card">
          <div class="market-name">${label}</div>
          <div class="market-value">${formatIndexValue(q.price)}</div>
          <div class="market-change ${dir}">${arrow} ${formatIndexValue(Math.abs(q.changeAmt))} (${window.StockData.formatPercent(q.changePct)})</div>
        </div>`;
    }).join("");
  }

  function renderAssetSummary(totals) {
    if (!totals) return "";
    totalValueEl.textContent = Math.round(totals.totalValue).toLocaleString("ko-KR") + "원";
    totalPnlEl.textContent = formatKrw(totals.totalPnl);
    totalPnlEl.className = "stat-num " + (totals.totalPnl > 0 ? "up" : totals.totalPnl < 0 ? "down" : "");
    totalReturnEl.textContent = window.StockData.formatPercent(totals.totalReturnPct);
    totalReturnEl.className = "stat-num " + (totals.totalReturnPct > 0 ? "up" : totals.totalReturnPct < 0 ? "down" : "");
    dailyPnlEl.textContent = formatKrw(totals.dailyPnl);
    dailyPnlEl.className = "stat-num " + (totals.dailyPnl > 0 ? "up" : totals.dailyPnl < 0 ? "down" : "");

    return totals.fxMissing
      ? " · 일부 해외 종목의 환율을 불러오지 못해 총자산 계산에서 제외되었습니다."
      : "";
  }

  async function refreshAll() {
    if (refreshing) return;
    refreshing = true;
    refreshBtn.disabled = true;

    try {
      const [, totals] = await Promise.all([
        renderIndexCards(),
        window.Holdings.render(),
        window.Watchlist.render(),
      ]);
      const caveat = renderAssetSummary(totals);
      lastUpdatedEl.textContent = "마지막 업데이트: " + new Date().toLocaleTimeString("ko-KR") + caveat;
    } catch (err) {
      lastUpdatedEl.textContent = "일부 데이터를 불러오지 못했습니다. 새로고침을 눌러 다시 시도해주세요.";
    } finally {
      refreshing = false;
      refreshBtn.disabled = false;
    }
  }

  refreshBtn.addEventListener("click", refreshAll);

  setInterval(() => {
    if (document.hidden) return;
    refreshAll();
  }, AUTO_REFRESH_MS);

  refreshAll();
})();
