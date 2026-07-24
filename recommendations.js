(() => {
  const grid = document.getElementById("recommendationGrid");
  if (!grid || !window.StockData) return;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  grid.innerHTML = window.StockData.CURATED_STOCKS.map((s) => {
    const reasonsHtml = s.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
    return `
      <div class="card rec-card reveal">
        <div class="rec-card-head">
          <div>
            <h3>${escapeHtml(s.nameKo)}</h3>
            <span class="rec-symbol">${escapeHtml(s.symbol)} · ${escapeHtml(s.market)}</span>
          </div>
          <span class="rec-sector-badge">${escapeHtml(s.sector)}</span>
        </div>
        <p class="rec-desc">${escapeHtml(s.description)}</p>
        <ul class="rec-reasons">${reasonsHtml}</ul>
        <div class="rec-actions">
          <button type="button" class="btn btn-secondary rec-analyze-btn" data-symbol="${escapeHtml(s.symbol)}">종목 분석 보기</button>
          <button type="button" class="btn btn-primary rec-backtest-btn" data-symbol="${escapeHtml(s.symbol)}">백테스트 해보기</button>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".rec-analyze-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.StockAnalyzer?.analyzeSymbol(btn.dataset.symbol);
    });
  });

  grid.querySelectorAll(".rec-backtest-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.Backtest?.runFor(btn.dataset.symbol);
    });
  });
})();
