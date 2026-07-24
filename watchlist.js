window.Watchlist = (() => {
  const tbody = document.getElementById("watchlistTableBody");
  const emptyEl = document.getElementById("watchlistEmpty");
  const searchInput = document.getElementById("watchlistSearchInput");
  const addBtn = document.getElementById("addWatchlistBtn");

  if (!tbody || !window.PortfolioStore || !window.StockData) return { render() {} };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function resolveSymbolFromInput(raw) {
    const value = raw.trim();
    if (!value) return null;
    const byName = window.StockData.CURATED_STOCKS.find(
      (s) => s.nameKo === value || s.symbol.toLowerCase() === value.toLowerCase()
    );
    return byName ? byName.symbol : value;
  }

  async function addFromSearch() {
    const symbol = resolveSymbolFromInput(searchInput.value);
    if (!symbol) return;

    addBtn.disabled = true;
    try {
      await window.StockData.fetchQuote(symbol);
      window.PortfolioStore.addToWatchlist(symbol);
      searchInput.value = "";
      render();
    } catch {
      alert("존재하지 않는 종목 코드이거나 시세를 확인할 수 없습니다: " + symbol);
    } finally {
      addBtn.disabled = false;
    }
  }

  async function render() {
    const symbols = window.PortfolioStore.getWatchlist();
    if (!symbols.length) {
      tbody.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    tbody.innerHTML = symbols
      .map(
        (symbol) => `
      <tr data-symbol="${escapeHtml(symbol)}">
        <td><span class="row-name">${escapeHtml(symbol)}</span></td>
        <td colspan="3" class="row-loading">시세 불러오는 중...</td>
        <td class="row-actions">
          <button type="button" class="icon-btn row-remove-btn" aria-label="관심종목 삭제">✕</button>
        </td>
      </tr>`
      )
      .join("");

    const quotes = await window.StockData.fetchQuotesBatch(symbols);

    symbols.forEach((symbol) => {
      const row = tbody.querySelector(`tr[data-symbol="${CSS.escape(symbol)}"]`);
      if (!row) return;
      const entry = quotes.get(symbol);

      if (!entry || entry.error) {
        row.innerHTML = `
          <td><span class="row-name">${escapeHtml(symbol)}</span></td>
          <td colspan="3" class="row-loading">시세 조회 실패</td>
          <td class="row-actions"><button type="button" class="icon-btn row-remove-btn" aria-label="관심종목 삭제">✕</button></td>`;
        return;
      }

      const q = entry.quote;
      const dir = q.changePct > 0 ? "up" : q.changePct < 0 ? "down" : "";
      row.innerHTML = `
        <td><span class="row-name">${escapeHtml(q.name)}</span><span class="row-symbol">${escapeHtml(symbol)}</span></td>
        <td>${window.StockData.formatPrice(q.price, q.currency)}</td>
        <td class="${dir}">${window.StockData.formatPercent(q.changePct)}</td>
        <td>${q.volume != null ? q.volume.toLocaleString("ko-KR") : "-"}</td>
        <td class="row-actions"><button type="button" class="icon-btn row-remove-btn" aria-label="관심종목 삭제">✕</button></td>`;
    });
  }

  tbody.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-symbol]");
    if (!row) return;
    const symbol = row.dataset.symbol;

    if (e.target.closest(".row-remove-btn")) {
      window.PortfolioStore.removeFromWatchlist(symbol);
      render();
      return;
    }
    window.DetailPanel?.show(symbol);
  });

  addBtn.addEventListener("click", addFromSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFromSearch();
    }
  });

  return { render };
})();
