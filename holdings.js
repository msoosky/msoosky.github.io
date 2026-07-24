window.Holdings = (() => {
  const tbody = document.getElementById("holdingsTableBody");
  const emptyEl = document.getElementById("holdingsEmpty");
  const symbolInput = document.getElementById("holdingSymbolInput");
  const livePreview = document.getElementById("holdingLivePreview");
  const qtyInput = document.getElementById("holdingQtyInput");
  const avgPriceInput = document.getElementById("holdingAvgPriceInput");
  const submitBtn = document.getElementById("holdingSubmitBtn");
  const cancelEditBtn = document.getElementById("holdingCancelEditBtn");
  const formError = document.getElementById("holdingFormError");

  if (!tbody || !window.PortfolioStore || !window.StockData) return { render() {}, getTotals: () => null };

  let lastTotals = null;
  let editId = null;
  let previewToken = 0;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function lookupName(symbol) {
    const curated = window.StockData.CURATED_STOCKS.find((s) => s.symbol === symbol);
    return curated ? curated.nameKo : symbol;
  }

  function resolveSymbolFromInput(raw) {
    const value = raw.trim();
    if (!value) return null;
    const byName = window.StockData.CURATED_STOCKS.find(
      (s) => s.nameKo === value || s.symbol.toLowerCase() === value.toLowerCase()
    );
    return byName ? byName.symbol : value;
  }

  // Debounced real-time lookup: as the user types/picks a symbol, show its
  // live price next to the field so they can confirm it's the right stock
  // before adding — no separate "search" step required.
  let previewTimer = null;
  function schedulePreview() {
    clearTimeout(previewTimer);
    const raw = symbolInput.value;
    if (!raw.trim()) {
      livePreview.textContent = "";
      return;
    }
    livePreview.textContent = "조회 중...";
    previewTimer = setTimeout(async () => {
      const symbol = resolveSymbolFromInput(raw);
      const token = ++previewToken;
      if (!symbol) return;
      try {
        const q = await window.StockData.fetchQuote(symbol);
        if (token !== previewToken) return;
        livePreview.textContent = `${q.name} 현재가: ${window.StockData.formatPrice(q.price, q.currency)}`;
      } catch {
        if (token !== previewToken) return;
        livePreview.textContent = "일치하는 종목을 찾을 수 없습니다.";
      }
    }, 400);
  }

  function resetForm() {
    editId = null;
    symbolInput.value = "";
    qtyInput.value = "";
    avgPriceInput.value = "";
    livePreview.textContent = "";
    formError.textContent = "";
    submitBtn.textContent = "추가";
    cancelEditBtn.hidden = true;
  }

  function startEdit(holding) {
    editId = holding.id;
    symbolInput.value = holding.symbol;
    qtyInput.value = holding.qty;
    avgPriceInput.value = holding.avgPrice;
    formError.textContent = "";
    submitBtn.textContent = "저장";
    cancelEditBtn.hidden = false;
    schedulePreview();
    symbolInput.focus();
  }

  async function handleSubmit() {
    const symbol = resolveSymbolFromInput(symbolInput.value);
    const qty = Number(qtyInput.value);
    const avgPrice = Number(avgPriceInput.value);

    if (!symbol || qty <= 0 || avgPrice < 0) {
      formError.textContent = "종목, 수량, 평균매수가를 모두 확인해주세요.";
      return;
    }

    formError.textContent = "종목 코드를 확인하는 중...";
    submitBtn.disabled = true;

    try {
      const quote = await window.StockData.fetchQuote(symbol);
      const name = quote.name || lookupName(symbol);

      if (editId) {
        window.PortfolioStore.updateHolding(editId, { symbol, name, qty, avgPrice });
      } else {
        window.PortfolioStore.addHolding({ symbol, name, qty, avgPrice });
      }
      resetForm();
      render();
    } catch {
      formError.textContent = "존재하지 않는 종목 코드이거나 시세를 확인할 수 없습니다. 코드를 다시 확인해주세요.";
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function render() {
    const holdings = window.PortfolioStore.getHoldings();
    if (!holdings.length) {
      tbody.innerHTML = "";
      emptyEl.hidden = false;
      lastTotals = { totalValue: 0, totalCost: 0, totalPnl: 0, totalReturnPct: null, dailyPnl: 0, fxMissing: false };
      return lastTotals;
    }
    emptyEl.hidden = true;

    tbody.innerHTML = holdings
      .map(
        (h) => `
      <tr data-id="${escapeHtml(h.id)}" data-symbol="${escapeHtml(h.symbol)}">
        <td><span class="row-name">${escapeHtml(h.name || h.symbol)}</span><span class="row-symbol">${escapeHtml(h.symbol)}</span></td>
        <td>${h.qty.toLocaleString("ko-KR")}</td>
        <td colspan="5" class="row-loading">시세 불러오는 중...</td>
        <td class="row-actions">
          <button type="button" class="icon-btn row-edit-btn" aria-label="수정">✎</button>
          <button type="button" class="icon-btn row-delete-btn" aria-label="삭제">🗑</button>
        </td>
      </tr>`
      )
      .join("");

    const needsFx = holdings.some((h) => !h.symbol.endsWith(".KS") && !h.symbol.endsWith(".KQ"));
    const [quotes, fxRate] = await Promise.all([
      window.StockData.fetchQuotesBatch(holdings.map((h) => h.symbol)),
      needsFx
        ? window.StockData.fetchQuote("KRW=X")
            .then((q) => q.price)
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    let totalValue = 0;
    let totalCost = 0;
    let dailyPnl = 0;
    let fxMissing = false;

    holdings.forEach((h) => {
      const row = tbody.querySelector(`tr[data-id="${CSS.escape(h.id)}"]`);
      if (!row) return;
      const entry = quotes.get(h.symbol);
      const cost = h.qty * h.avgPrice;

      if (!entry || entry.error) {
        row.innerHTML = `
          <td><span class="row-name">${escapeHtml(h.name || h.symbol)}</span><span class="row-symbol">${escapeHtml(h.symbol)}</span></td>
          <td>${h.qty.toLocaleString("ko-KR")}</td>
          <td>${h.avgPrice.toLocaleString("ko-KR")}</td>
          <td colspan="4" class="row-loading">시세 조회 실패</td>
          <td class="row-actions">
            <button type="button" class="icon-btn row-edit-btn" aria-label="수정">✎</button>
            <button type="button" class="icon-btn row-delete-btn" aria-label="삭제">🗑</button>
          </td>`;
        return;
      }

      const q = entry.quote;
      const evalAmount = h.qty * q.price;
      const pnl = evalAmount - cost;
      const returnPct = cost > 0 ? (pnl / cost) * 100 : 0;
      const dayChange = q.changeAmt != null ? q.changeAmt * h.qty : 0;

      // Portfolio totals need one common currency (KRW); convert non-KRW
      // rows using the live USD/KRW rate instead of summing mixed currencies.
      const toKrw = q.currency === "KRW" ? 1 : fxRate;
      if (toKrw == null) {
        fxMissing = true;
      } else {
        totalValue += evalAmount * toKrw;
        totalCost += cost * toKrw;
        dailyPnl += dayChange * toKrw;
      }

      const pnlDir = pnl > 0 ? "up" : pnl < 0 ? "down" : "";

      row.innerHTML = `
        <td><span class="row-name">${escapeHtml(h.name || q.name)}</span><span class="row-symbol">${escapeHtml(h.symbol)}</span></td>
        <td>${h.qty.toLocaleString("ko-KR")}</td>
        <td>${window.StockData.formatPrice(h.avgPrice, q.currency)}</td>
        <td>${window.StockData.formatPrice(q.price, q.currency)}</td>
        <td>${window.StockData.formatPrice(evalAmount, q.currency)}</td>
        <td class="${pnlDir}">${window.StockData.formatPrice(pnl, q.currency)}</td>
        <td class="${pnlDir}">${window.StockData.formatPercent(returnPct)}</td>
        <td class="row-actions">
          <button type="button" class="icon-btn row-edit-btn" aria-label="수정">✎</button>
          <button type="button" class="icon-btn row-delete-btn" aria-label="삭제">🗑</button>
        </td>`;
    });

    const totalPnl = totalValue - totalCost;
    const totalReturnPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;
    lastTotals = { totalValue, totalCost, totalPnl, totalReturnPct, dailyPnl, fxMissing };
    return lastTotals;
  }

  tbody.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    const id = row.dataset.id;
    const symbol = row.dataset.symbol;

    if (e.target.closest(".row-edit-btn")) {
      const holding = window.PortfolioStore.getHoldings().find((h) => h.id === id);
      if (holding) startEdit(holding);
      return;
    }
    if (e.target.closest(".row-delete-btn")) {
      if (confirm("이 보유 종목을 삭제할까요?")) {
        if (editId === id) resetForm();
        window.PortfolioStore.deleteHolding(id);
        render();
      }
      return;
    }
    window.DetailPanel?.show(symbol);
  });

  symbolInput.addEventListener("input", schedulePreview);
  symbolInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  });
  submitBtn.addEventListener("click", handleSubmit);
  cancelEditBtn.addEventListener("click", resetForm);

  return {
    render,
    getTotals: () => lastTotals,
  };
})();
