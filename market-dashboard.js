(() => {
  const tickerBarEl = document.getElementById("tickerBar");
  const searchInput = document.getElementById("marketSearchInput");
  const resultCountEl = document.getElementById("marketResultCount");
  const scrollEl = document.getElementById("marketTableScroll");
  const spacerEl = document.getElementById("marketTableSpacer");
  const viewportEl = document.getElementById("marketTableViewport");

  if (!tickerBarEl || !scrollEl || !window.MarketMock) return;

  const ROW_HEIGHT = 44;
  const BUFFER = 6;

  const fullList = window.MarketMock.getUniverse();
  let filteredList = fullList;

  /** symbol -> {el, priceEl, changeEl, changePctEl, volumeEl, valueEl, lastPrice} */
  let renderedRows = new Map();
  let tickerItems = new Map();
  let tickerLastPrices = new Map();

  function fmtPrice(v, currency) {
    if (v == null) return "-";
    if (currency === "KRW") return Math.round(v).toLocaleString("ko-KR");
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtChangeAmt(stock) {
    const sign = stock.changeAmt > 0 ? "+" : "";
    return sign + fmtPrice(stock.changeAmt, stock.currency);
  }

  function fmtPct(pct) {
    const sign = pct > 0 ? "+" : "";
    return sign + pct.toFixed(2) + "%";
  }

  function fmtCompact(value, currency) {
    if (currency === "KRW") {
      if (value >= 1e12) return (value / 1e12).toFixed(2) + "조";
      if (value >= 1e8) return (value / 1e8).toFixed(1) + "억";
      return Math.round(value).toLocaleString("ko-KR");
    }
    if (value >= 1e9) return "$" + (value / 1e9).toFixed(2) + "B";
    if (value >= 1e6) return "$" + (value / 1e6).toFixed(1) + "M";
    return "$" + Math.round(value).toLocaleString("en-US");
  }

  function dirClass(v) {
    return v > 0 ? "up" : v < 0 ? "down" : "";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function flash(el, direction) {
    if (!direction) return;
    el.classList.remove("flash-up", "flash-down");
    // Force reflow so the animation restarts even if it's still fading from the last tick.
    void el.offsetWidth;
    el.classList.add(direction === "up" ? "flash-up" : "flash-down");
  }

  // ---- Ticker bar ----
  function renderTickerBar() {
    const indexes = window.MarketMock.getIndexes();
    tickerBarEl.innerHTML = indexes
      .map(
        (idx) => `
      <div class="ticker-item mono" data-symbol="${idx.symbol}">
        <span class="ticker-label">${escapeHtml(idx.label)}</span>
        <span class="ticker-price">${idx.price.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span class="ticker-change ${dirClass(idx.changePct)}">${idx.changeAmt >= 0 ? "+" : ""}${idx.changeAmt.toFixed(2)} (${fmtPct(idx.changePct)})</span>
      </div>`
      )
      .join("");
    tickerItems = new Map([...tickerBarEl.querySelectorAll(".ticker-item")].map((el) => [el.dataset.symbol, el]));
    tickerLastPrices = new Map(indexes.map((i) => [i.symbol, i.price]));
  }

  function updateTickerBar() {
    window.MarketMock.getIndexes().forEach((idx) => {
      const el = tickerItems.get(idx.symbol);
      if (!el) return;
      const lastPrice = tickerLastPrices.get(idx.symbol);
      const tickDir = idx.price > lastPrice ? "up" : idx.price < lastPrice ? "down" : "";
      tickerLastPrices.set(idx.symbol, idx.price);

      el.querySelector(".ticker-price").textContent = idx.price.toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const changeEl = el.querySelector(".ticker-change");
      changeEl.textContent = `${idx.changeAmt >= 0 ? "+" : ""}${idx.changeAmt.toFixed(2)} (${fmtPct(idx.changePct)})`;
      changeEl.className = "ticker-change " + dirClass(idx.changePct);

      flash(el, tickDir);
    });
  }

  // ---- Virtualized table ----
  function buildRow(stock) {
    const el = document.createElement("div");
    el.className = "market-row";
    el.dataset.symbol = stock.symbol;
    el.innerHTML = `
      <span class="row-symbol-cell mono">${escapeHtml(stock.symbol.replace(/\.(KS|KQ)$/, ""))}</span>
      <span class="row-name-cell">${escapeHtml(stock.name)}<span class="row-sector-cell">${escapeHtml(stock.sector)}</span></span>
      <span class="num mono price-cell">${fmtPrice(stock.price, stock.currency)}</span>
      <span class="num mono change-cell ${dirClass(stock.changePct)}">${fmtChangeAmt(stock)}</span>
      <span class="num mono changepct-cell ${dirClass(stock.changePct)}">${fmtPct(stock.changePct)}</span>
      <span class="num mono volume-cell">${Math.round(stock.volume).toLocaleString("ko-KR")}</span>
      <span class="num mono value-cell">${fmtCompact(stock.tradingValue, stock.currency)}</span>
      <span class="num mono range-cell">${fmtPrice(stock.weekLow52, stock.currency)} ~ ${fmtPrice(stock.weekHigh52, stock.currency)}</span>
    `;
    el.addEventListener("click", () => window.MarketDetail?.show(stock.symbol));
    return {
      el,
      priceEl: el.querySelector(".price-cell"),
      changeEl: el.querySelector(".change-cell"),
      changePctEl: el.querySelector(".changepct-cell"),
      volumeEl: el.querySelector(".volume-cell"),
      valueEl: el.querySelector(".value-cell"),
      lastPrice: stock.price,
    };
  }

  function renderVisibleRows() {
    const scrollTop = scrollEl.scrollTop;
    const viewportHeight = scrollEl.clientHeight || 520;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + BUFFER * 2;
    const endIndex = Math.min(filteredList.length, startIndex + visibleCount);

    spacerEl.style.height = filteredList.length * ROW_HEIGHT + "px";
    viewportEl.style.transform = `translateY(${startIndex * ROW_HEIGHT}px)`;

    renderedRows = new Map();
    const frag = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const stock = filteredList[i];
      const row = buildRow(stock);
      frag.appendChild(row.el);
      renderedRows.set(stock.symbol, row);
    }
    viewportEl.innerHTML = "";
    viewportEl.appendChild(frag);
  }

  let scrollRaf = null;
  scrollEl.addEventListener("scroll", () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null;
      renderVisibleRows();
    });
  });

  // ---- Debounced search (dataset is small enough that filtering itself is
  // sub-millisecond; the debounce just batches fast keystrokes) ----
  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilter, 100);
  });

  function applyFilter() {
    const q = searchInput.value.trim().toLowerCase();
    filteredList = !q
      ? fullList
      : fullList.filter(
          (s) =>
            s.symbol.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.sector.toLowerCase().includes(q)
        );
    resultCountEl.textContent = filteredList.length.toLocaleString("ko-KR") + "개 종목";
    scrollEl.scrollTop = 0;
    renderVisibleRows();
  }

  // ---- Live tick handling: only DOM-patch rows currently rendered ----
  function handleTick({ changedSymbols }) {
    changedSymbols.forEach((symbol) => {
      const row = renderedRows.get(symbol);
      if (!row) return;
      const stock = window.MarketMock.getStock(symbol);
      const tickDir = stock.price > row.lastPrice ? "up" : stock.price < row.lastPrice ? "down" : "";
      row.lastPrice = stock.price;

      row.priceEl.textContent = fmtPrice(stock.price, stock.currency);
      row.changeEl.textContent = fmtChangeAmt(stock);
      row.changeEl.className = "num mono change-cell " + dirClass(stock.changePct);
      row.changePctEl.textContent = fmtPct(stock.changePct);
      row.changePctEl.className = "num mono changepct-cell " + dirClass(stock.changePct);
      row.volumeEl.textContent = Math.round(stock.volume).toLocaleString("ko-KR");
      row.valueEl.textContent = fmtCompact(stock.tradingValue, stock.currency);

      flash(row.el, tickDir);
    });

    updateTickerBar();
  }

  renderTickerBar();
  applyFilter();
  window.MarketMock.subscribe(handleTick);
  window.MarketMock.start(1500);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.MarketMock.stop();
    else window.MarketMock.start(1500);
  });
})();
