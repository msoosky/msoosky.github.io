window.PortfolioStore = (() => {
  const HOLDINGS_KEY = "stockSuccess.portfolio.holdings.v1";
  const WATCHLIST_KEY = "stockSuccess.portfolio.watchlist.v1";

  const DEMO_HOLDINGS = [
    { id: "demo-1", symbol: "005930.KS", name: "삼성전자", qty: 20, avgPrice: 68000 },
    { id: "demo-2", symbol: "AAPL", name: "애플", qty: 5, avgPrice: 190 },
  ];
  const DEMO_WATCHLIST = ["000660.KS", "NVDA", "035420.KS"];

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage unavailable (private mode / quota) — data just won't persist across reloads
    }
  }

  function getHoldings() {
    return readJson(HOLDINGS_KEY, null) ?? DEMO_HOLDINGS.slice();
  }

  function saveHoldings(list) {
    writeJson(HOLDINGS_KEY, list);
  }

  function addHolding({ symbol, name, qty, avgPrice }) {
    const list = getHoldings();
    list.push({ id: "h-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), symbol, name, qty, avgPrice });
    saveHoldings(list);
    return list;
  }

  function updateHolding(id, patch) {
    const list = getHoldings().map((h) => (h.id === id ? { ...h, ...patch } : h));
    saveHoldings(list);
    return list;
  }

  function deleteHolding(id) {
    const list = getHoldings().filter((h) => h.id !== id);
    saveHoldings(list);
    return list;
  }

  function getWatchlist() {
    return readJson(WATCHLIST_KEY, null) ?? DEMO_WATCHLIST.slice();
  }

  function saveWatchlist(list) {
    writeJson(WATCHLIST_KEY, list);
  }

  function addToWatchlist(symbol) {
    const list = getWatchlist();
    if (!list.includes(symbol)) list.push(symbol);
    saveWatchlist(list);
    return list;
  }

  function removeFromWatchlist(symbol) {
    const list = getWatchlist().filter((s) => s !== symbol);
    saveWatchlist(list);
    return list;
  }

  function isInWatchlist(symbol) {
    return getWatchlist().includes(symbol);
  }

  return {
    getHoldings,
    saveHoldings,
    addHolding,
    updateHolding,
    deleteHolding,
    getWatchlist,
    saveWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
  };
})();
