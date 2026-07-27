(() => {
  const tickerBarEl = document.getElementById("tickerBar");
  const searchInput = document.getElementById("marketSearchInput");
  const suggestEl = document.getElementById("marketSearchSuggest");
  const watchFilterBtn = document.getElementById("watchlistFilterBtn");
  const resultCountEl = document.getElementById("marketResultCount");
  const scrollEl = document.getElementById("marketTableScroll");
  const spacerEl = document.getElementById("marketTableSpacer");
  const viewportEl = document.getElementById("marketTableViewport");

  if (!tickerBarEl || !scrollEl || !window.MarketData) return;

  const ROW_HEIGHT = 44;
  const BUFFER = 6;
  const MAX_SUGGESTIONS = 8;
  const TOAST_LIFETIME_MS = 6000;

  const fullList = window.MarketData.getUniverse();
  let filteredList = fullList;
  let watchFilterActive = false;

  /** symbol -> {el, priceValueEl, risingBadgeEl, changeEl, changePctEl, volumeEl, valueEl, rangeEl, starEl, lastPrice} */
  let renderedRows = new Map();
  let tickerItems = new Map();
  let tickerLastPrices = new Map();

  function fmtPrice(v, currency) {
    if (v == null) return "-";
    if (currency === "KRW") return Math.round(v).toLocaleString("ko-KR");
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtChangeAmt(stock) {
    if (stock.changeAmt == null) return "-";
    const sign = stock.changeAmt > 0 ? "+" : "";
    return sign + fmtPrice(stock.changeAmt, stock.currency);
  }

  function fmtPct(pct) {
    if (pct == null) return "-";
    const sign = pct > 0 ? "+" : "";
    return sign + pct.toFixed(2) + "%";
  }

  function fmtCompact(value, currency) {
    if (value == null) return "-";
    if (currency === "KRW") {
      if (value >= 1e12) return (value / 1e12).toFixed(2) + "조";
      if (value >= 1e8) return (value / 1e8).toFixed(1) + "억";
      return Math.round(value).toLocaleString("ko-KR");
    }
    if (value >= 1e9) return "$" + (value / 1e9).toFixed(2) + "B";
    if (value >= 1e6) return "$" + (value / 1e6).toFixed(1) + "M";
    return "$" + Math.round(value).toLocaleString("en-US");
  }

  function fmtVolume(v) {
    return v == null ? "-" : Math.round(v).toLocaleString("ko-KR");
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

  // ---- Toasts for rising-watchlist signals ----
  let toastContainer = null;
  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement("div");
    toastContainer.className = "signal-toast-container";
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showSignalToast({ name, changePct }) {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = "signal-toast";
    toast.innerHTML = `<span class="signal-toast-icon">🔺</span><span>${escapeHtml(name)} 상승 신호${changePct != null ? " (" + fmtPct(changePct) + ")" : ""}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 400);
    }, TOAST_LIFETIME_MS);
  }

  // ---- Ticker bar (real index/FX quotes) ----
  function renderTickerBar() {
    const indexes = window.MarketData.getIndexes();
    tickerBarEl.innerHTML = indexes
      .map(
        (idx) => `
      <div class="ticker-item mono" data-symbol="${idx.symbol}">
        <span class="ticker-label">${escapeHtml(idx.label)}</span>
        <span class="ticker-price">${idx.price != null ? idx.price.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "불러오는 중"}</span>
        <span class="ticker-change ${dirClass(idx.changePct)}">${idx.changeAmt == null ? "" : (idx.changeAmt >= 0 ? "+" : "") + idx.changeAmt.toFixed(2) + " (" + fmtPct(idx.changePct) + ")"}</span>
      </div>`
      )
      .join("");
    tickerItems = new Map([...tickerBarEl.querySelectorAll(".ticker-item")].map((el) => [el.dataset.symbol, el]));
    tickerLastPrices = new Map(indexes.map((i) => [i.symbol, i.price]));
  }

  function updateTickerBar() {
    window.MarketData.getIndexes().forEach((idx) => {
      const el = tickerItems.get(idx.symbol);
      if (!el || idx.price == null) return;
      const lastPrice = tickerLastPrices.get(idx.symbol);
      const tickDir = lastPrice == null ? "" : idx.price > lastPrice ? "up" : idx.price < lastPrice ? "down" : "";
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
    const watched = window.MarketData.isWatched(stock.symbol);
    const showBadge = watched && stock.isRising;
    el.innerHTML = `
      <button type="button" class="watch-star-btn${watched ? " is-watched" : ""}" data-symbol="${escapeHtml(stock.symbol)}" aria-label="관심종목">${watched ? "★" : "☆"}</button>
      <span class="row-symbol-cell mono">${escapeHtml(stock.symbol.replace(/\.(KS|KQ)$/, ""))}</span>
      <span class="row-name-cell">${escapeHtml(stock.name)}<span class="row-sector-cell">${escapeHtml(stock.sector)}</span></span>
      <span class="num mono price-cell"><span class="price-value">${fmtPrice(stock.price, stock.currency)}</span><span class="rising-badge"${showBadge ? "" : " hidden"} title="관심종목 상승 신호">🔺</span></span>
      <span class="num mono change-cell ${dirClass(stock.changePct)}">${fmtChangeAmt(stock)}</span>
      <span class="num mono changepct-cell ${dirClass(stock.changePct)}">${fmtPct(stock.changePct)}</span>
      <span class="num mono volume-cell">${fmtVolume(stock.volume)}</span>
      <span class="num mono value-cell">${fmtCompact(stock.tradingValue, stock.currency)}</span>
      <span class="num mono range-cell">${fmtPrice(stock.weekLow52, stock.currency)} ~ ${fmtPrice(stock.weekHigh52, stock.currency)}</span>
    `;
    el.addEventListener("click", (e) => {
      if (e.target.closest(".watch-star-btn")) return;
      window.MarketDetail?.show(stock.symbol);
    });
    el.querySelector(".watch-star-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      window.MarketData.toggleWatch(stock.symbol);
    });
    return {
      el,
      starEl: el.querySelector(".watch-star-btn"),
      priceValueEl: el.querySelector(".price-value"),
      risingBadgeEl: el.querySelector(".rising-badge"),
      changeEl: el.querySelector(".change-cell"),
      changePctEl: el.querySelector(".changepct-cell"),
      volumeEl: el.querySelector(".volume-cell"),
      valueEl: el.querySelector(".value-cell"),
      rangeEl: el.querySelector(".range-cell"),
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
    const visibleSymbols = [];
    for (let i = startIndex; i < endIndex; i++) {
      const stock = filteredList[i];
      const row = buildRow(stock);
      frag.appendChild(row.el);
      renderedRows.set(stock.symbol, row);
      visibleSymbols.push(stock.symbol);
    }
    viewportEl.innerHTML = "";
    viewportEl.appendChild(frag);

    // Only ask the network for quotes on rows that are actually on screen —
    // this plus the watchlist union is what keeps a 190-symbol universe
    // loading in roughly a single ~10s poll instead of crawling through it.
    window.MarketData.setVisibleSymbols(visibleSymbols);
  }

  let scrollRaf = null;
  scrollEl.addEventListener("scroll", () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null;
      renderVisibleRows();
    });
  });

  function baseList() {
    return watchFilterActive ? fullList.filter((s) => window.MarketData.isWatched(s.symbol)) : fullList;
  }

  function matchesQuery(s, q) {
    return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
  }

  function applyFilter() {
    const q = searchInput.value.trim().toLowerCase();
    const base = baseList();
    filteredList = !q ? base : base.filter((s) => matchesQuery(s, q));
    resultCountEl.textContent = filteredList.length.toLocaleString("ko-KR") + "개 종목";
    scrollEl.scrollTop = 0;
    renderVisibleRows();
  }

  watchFilterBtn.addEventListener("click", () => {
    watchFilterActive = !watchFilterActive;
    watchFilterBtn.classList.toggle("is-active", watchFilterActive);
    watchFilterBtn.setAttribute("aria-pressed", String(watchFilterActive));
    applyFilter();
  });

  // ---- Related-search suggestions dropdown ----
  function renderSuggestions(query) {
    if (!query) {
      suggestEl.hidden = true;
      suggestEl.innerHTML = "";
      return;
    }
    const q = query.toLowerCase();
    const starts = [];
    const contains = [];
    for (const s of fullList) {
      const hay = s.symbol.toLowerCase() + " " + s.name.toLowerCase();
      if (s.symbol.toLowerCase().startsWith(q) || s.name.toLowerCase().startsWith(q)) starts.push(s);
      else if (hay.includes(q) || s.sector.toLowerCase().includes(q)) contains.push(s);
      if (starts.length >= MAX_SUGGESTIONS) break;
    }
    const combined = [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
    if (!combined.length) {
      suggestEl.hidden = true;
      suggestEl.innerHTML = "";
      return;
    }
    suggestEl.innerHTML = combined
      .map(
        (s) => `
      <li class="market-search-suggest-item" data-symbol="${escapeHtml(s.symbol)}">
        <span class="suggest-name">${escapeHtml(s.name)}</span>
        <span class="suggest-meta mono">${escapeHtml(s.symbol)} · ${escapeHtml(s.sector)}</span>
      </li>`
      )
      .join("");
    suggestEl.hidden = false;
  }

  function pickSuggestion(symbol) {
    const stock = fullList.find((s) => s.symbol === symbol);
    if (!stock) return;
    searchInput.value = stock.name;
    suggestEl.hidden = true;
    applyFilter();
    window.MarketDetail?.show(symbol);
  }

  suggestEl.addEventListener("mousedown", (e) => {
    // mousedown (not click) so this fires before the input's blur hides the list
    const item = e.target.closest(".market-search-suggest-item");
    if (!item) return;
    pickSuggestion(item.dataset.symbol);
  });

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) renderSuggestions(searchInput.value.trim());
  });

  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      suggestEl.hidden = true;
    }, 150);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      suggestEl.hidden = true;
    } else if (e.key === "Enter") {
      const first = suggestEl.querySelector(".market-search-suggest-item");
      if (!suggestEl.hidden && first) {
        e.preventDefault();
        pickSuggestion(first.dataset.symbol);
      }
    }
  });

  // Debounce batches fast keystrokes; filtering + suggestion lookup over
  // ~190 symbols is sub-millisecond either way.
  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const value = searchInput.value.trim();
    searchTimer = setTimeout(() => {
      applyFilter();
      renderSuggestions(value);
    }, 100);
  });

  // ---- Live update handling: only DOM-patch rows currently rendered, and
  // only in response to a real quote that actually changed. ----
  function handleTick({ changedSymbols }) {
    changedSymbols.forEach((symbol) => {
      const row = renderedRows.get(symbol);
      if (!row) return;
      const stock = window.MarketData.getStock(symbol);
      if (!stock) return;
      const tickDir =
        row.lastPrice != null && stock.price != null
          ? stock.price > row.lastPrice
            ? "up"
            : stock.price < row.lastPrice
            ? "down"
            : ""
          : "";
      row.lastPrice = stock.price;

      row.priceValueEl.textContent = fmtPrice(stock.price, stock.currency);
      row.risingBadgeEl.hidden = !(stock.isRising && window.MarketData.isWatched(symbol));
      row.changeEl.textContent = fmtChangeAmt(stock);
      row.changeEl.className = "num mono change-cell " + dirClass(stock.changePct);
      row.changePctEl.textContent = fmtPct(stock.changePct);
      row.changePctEl.className = "num mono changepct-cell " + dirClass(stock.changePct);
      row.volumeEl.textContent = fmtVolume(stock.volume);
      row.valueEl.textContent = fmtCompact(stock.tradingValue, stock.currency);
      row.rangeEl.textContent = `${fmtPrice(stock.weekLow52, stock.currency)} ~ ${fmtPrice(stock.weekHigh52, stock.currency)}`;

      flash(row.el, tickDir);
    });
  }

  function handleWatchlistChange() {
    renderedRows.forEach((row, symbol) => {
      const watched = window.MarketData.isWatched(symbol);
      row.starEl.classList.toggle("is-watched", watched);
      row.starEl.textContent = watched ? "★" : "☆";
      const stock = window.MarketData.getStock(symbol);
      row.risingBadgeEl.hidden = !(stock?.isRising && watched);
    });
    if (watchFilterActive) applyFilter();
  }

  renderTickerBar();
  applyFilter();
  window.MarketData.subscribe(handleTick);
  window.MarketData.subscribeIndexes(updateTickerBar);
  window.MarketData.subscribeWatchlist(handleWatchlistChange);
  window.MarketData.subscribeSignals(showSignalToast);
  window.MarketData.start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.MarketData.stop();
    else window.MarketData.start();
  });
})();
