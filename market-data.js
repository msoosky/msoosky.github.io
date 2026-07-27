/**
 * Real market data layer for the dashboard.
 *
 * Symbol/name/market/sector metadata below is static (real listed
 * companies), but every price/change/volume field is populated only from
 * window.StockData.fetchQuote(s) — the same Yahoo Finance chart endpoint
 * (via CORS proxy) already used by the stock-analysis and backtest tools.
 * Nothing here is ever generated with Math.random(); a field reads "-"
 * until a real quote for it has actually been fetched.
 *
 * Free public CORS proxies can't sustain hundreds of parallel requests, so
 * this module only fetches quotes for symbols the UI tells it are actually
 * visible (see setVisibleSymbols), in small chunks, on a ~25s cadence.
 */
window.MarketData = (() => {
  // symbol, name, market, sector, currency
  const SEED = [
    // --- KOSPI ---
    ["005930.KS", "삼성전자", "KOSPI", "반도체/전자", "KRW"],
    ["000660.KS", "SK하이닉스", "KOSPI", "반도체", "KRW"],
    ["373220.KS", "LG에너지솔루션", "KOSPI", "2차전지", "KRW"],
    ["207940.KS", "삼성바이오로직스", "KOSPI", "바이오/CDMO", "KRW"],
    ["005380.KS", "현대차", "KOSPI", "자동차", "KRW"],
    ["000270.KS", "기아", "KOSPI", "자동차", "KRW"],
    ["035420.KS", "NAVER", "KOSPI", "인터넷/플랫폼", "KRW"],
    ["035720.KS", "카카오", "KOSPI", "인터넷/플랫폼", "KRW"],
    ["006400.KS", "삼성SDI", "KOSPI", "2차전지", "KRW"],
    ["005490.KS", "POSCO홀딩스", "KOSPI", "철강", "KRW"],
    ["051910.KS", "LG화학", "KOSPI", "화학/배터리소재", "KRW"],
    ["068270.KS", "셀트리온", "KOSPI", "바이오", "KRW"],
    ["028260.KS", "삼성물산", "KOSPI", "지주/상사", "KRW"],
    ["105560.KS", "KB금융", "KOSPI", "금융", "KRW"],
    ["055550.KS", "신한지주", "KOSPI", "금융", "KRW"],
    ["012330.KS", "현대모비스", "KOSPI", "자동차부품", "KRW"],
    ["086790.KS", "하나금융지주", "KOSPI", "금융", "KRW"],
    ["066570.KS", "LG전자", "KOSPI", "가전/전자", "KRW"],
    ["015760.KS", "한국전력", "KOSPI", "유틸리티", "KRW"],
    ["096770.KS", "SK이노베이션", "KOSPI", "에너지/배터리", "KRW"],
    ["032830.KS", "삼성생명", "KOSPI", "보험", "KRW"],
    ["316140.KS", "우리금융지주", "KOSPI", "금융", "KRW"],
    ["017670.KS", "SK텔레콤", "KOSPI", "통신", "KRW"],
    ["033780.KS", "KT&G", "KOSPI", "담배/헬스케어", "KRW"],
    ["003670.KS", "포스코퓨처엠", "KOSPI", "배터리소재", "KRW"],
    ["009830.KS", "한화솔루션", "KOSPI", "화학/태양광", "KRW"],
    ["034220.KS", "LG디스플레이", "KOSPI", "디스플레이", "KRW"],
    ["000810.KS", "삼성화재", "KOSPI", "보험", "KRW"],
    ["010950.KS", "S-Oil", "KOSPI", "정유", "KRW"],
    ["034020.KS", "두산에너빌리티", "KOSPI", "에너지설비", "KRW"],
    ["009540.KS", "HD한국조선해양", "KOSPI", "조선", "KRW"],
    ["259960.KS", "크래프톤", "KOSPI", "게임", "KRW"],
    ["323410.KS", "카카오뱅크", "KOSPI", "인터넷은행", "KRW"],
    ["377300.KS", "카카오페이", "KOSPI", "핀테크", "KRW"],
    ["011200.KS", "HMM", "KOSPI", "해운", "KRW"],
    ["090430.KS", "아모레퍼시픽", "KOSPI", "화장품", "KRW"],
    ["011170.KS", "롯데케미칼", "KOSPI", "화학", "KRW"],
    ["042700.KS", "한미반도체", "KOSPI", "반도체장비", "KRW"],
    ["003490.KS", "대한항공", "KOSPI", "항공", "KRW"],
    ["021240.KS", "코웨이", "KOSPI", "생활가전", "KRW"],
    ["051900.KS", "LG생활건강", "KOSPI", "화장품/생활용품", "KRW"],
    ["006360.KS", "GS건설", "KOSPI", "건설", "KRW"],
    ["302440.KS", "SK바이오사이언스", "KOSPI", "백신/바이오", "KRW"],
    ["251270.KS", "넷마블", "KOSPI", "게임", "KRW"],
    ["036570.KS", "엔씨소프트", "KOSPI", "게임", "KRW"],
    ["004020.KS", "현대제철", "KOSPI", "철강", "KRW"],
    ["139480.KS", "이마트", "KOSPI", "유통", "KRW"],
    ["097950.KS", "CJ제일제당", "KOSPI", "식품", "KRW"],
    ["009150.KS", "삼성전기", "KOSPI", "전자부품", "KRW"],
    ["402340.KS", "SK스퀘어", "KOSPI", "투자지주", "KRW"],
    ["086280.KS", "현대글로비스", "KOSPI", "물류", "KRW"],
    ["024110.KS", "기업은행", "KOSPI", "금융", "KRW"],
    ["138040.KS", "메리츠금융지주", "KOSPI", "금융지주", "KRW"],
    ["161390.KS", "한국타이어앤테크놀로지", "KOSPI", "타이어", "KRW"],
    ["005830.KS", "DB손해보험", "KOSPI", "보험", "KRW"],
    ["000720.KS", "현대건설", "KOSPI", "건설", "KRW"],
    ["078930.KS", "GS", "KOSPI", "지주", "KRW"],
    ["010120.KS", "LS ELECTRIC", "KOSPI", "전기기기", "KRW"],
    ["012450.KS", "한화에어로스페이스", "KOSPI", "방산", "KRW"],
    ["035250.KS", "강원랜드", "KOSPI", "카지노/레저", "KRW"],
    ["271560.KS", "오리온", "KOSPI", "식품", "KRW"],
    ["003550.KS", "LG", "KOSPI", "지주", "KRW"],
    ["034730.KS", "SK", "KOSPI", "지주", "KRW"],
    ["000120.KS", "CJ대한통운", "KOSPI", "물류", "KRW"],
    ["047810.KS", "한국항공우주", "KOSPI", "방산/항공", "KRW"],
    ["079550.KS", "LIG넥스원", "KOSPI", "방산", "KRW"],
    ["010620.KS", "현대미포조선", "KOSPI", "조선", "KRW"],
    ["042660.KS", "한화오션", "KOSPI", "조선", "KRW"],
    ["375500.KS", "DL이앤씨", "KOSPI", "건설", "KRW"],
    ["002790.KS", "아모레퍼시픽그룹", "KOSPI", "화장품지주", "KRW"],
    ["017800.KS", "현대엘리베이터", "KOSPI", "승강기", "KRW"],
    ["241560.KS", "두산밥캣", "KOSPI", "기계", "KRW"],
    ["000150.KS", "두산", "KOSPI", "지주", "KRW"],
    ["000990.KS", "DB하이텍", "KOSPI", "반도체", "KRW"],
    ["001450.KS", "현대해상", "KOSPI", "보험", "KRW"],
    ["006280.KS", "녹십자", "KOSPI", "제약", "KRW"],
    ["000100.KS", "유한양행", "KOSPI", "제약", "KRW"],
    ["383800.KS", "LX홀딩스", "KOSPI", "지주", "KRW"],
    ["138930.KS", "BNK금융지주", "KOSPI", "금융", "KRW"],
    ["175330.KS", "JB금융지주", "KOSPI", "금융", "KRW"],

    // --- KOSDAQ ---
    ["086520.KQ", "에코프로", "KOSDAQ", "2차전지소재", "KRW"],
    ["247540.KQ", "에코프로비엠", "KOSDAQ", "2차전지소재", "KRW"],
    ["196170.KQ", "알테오젠", "KOSDAQ", "바이오", "KRW"],
    ["028300.KQ", "HLB", "KOSDAQ", "바이오", "KRW"],
    ["068760.KQ", "셀트리온제약", "KOSDAQ", "제약", "KRW"],
    ["214150.KQ", "클래시스", "KOSDAQ", "의료기기", "KRW"],
    ["141080.KQ", "리가켐바이오", "KOSDAQ", "바이오", "KRW"],
    ["214450.KQ", "파마리서치", "KOSDAQ", "바이오/미용", "KRW"],
    ["263750.KQ", "펄어비스", "KOSDAQ", "게임", "KRW"],
    ["253450.KQ", "스튜디오드래곤", "KOSDAQ", "콘텐츠", "KRW"],
    ["035900.KQ", "JYP Ent.", "KOSDAQ", "엔터테인먼트", "KRW"],
    ["041510.KQ", "에스엠", "KOSDAQ", "엔터테인먼트", "KRW"],
    ["122870.KQ", "와이지엔터테인먼트", "KOSDAQ", "엔터테인먼트", "KRW"],
    ["277810.KQ", "레인보우로보틱스", "KOSDAQ", "로봇", "KRW"],
    ["365340.KQ", "성일하이텍", "KOSDAQ", "2차전지 리사이클", "KRW"],
    ["005290.KQ", "동진쎄미켐", "KOSDAQ", "반도체소재", "KRW"],
    ["145020.KQ", "휴젤", "KOSDAQ", "미용/바이오", "KRW"],
    ["328130.KQ", "루닛", "KOSDAQ", "AI/의료", "KRW"],
    ["403870.KQ", "HPSP", "KOSDAQ", "반도체장비", "KRW"],
    ["293490.KQ", "카카오게임즈", "KOSDAQ", "게임", "KRW"],
    ["112040.KQ", "위메이드", "KOSDAQ", "게임", "KRW"],
    ["078340.KQ", "컴투스", "KOSDAQ", "게임", "KRW"],
    ["357780.KQ", "솔브레인", "KOSDAQ", "반도체소재", "KRW"],
    ["066970.KQ", "엘앤에프", "KOSDAQ", "2차전지소재", "KRW"],
    ["039030.KQ", "이오테크닉스", "KOSDAQ", "반도체장비", "KRW"],

    // --- NASDAQ / NYSE ---
    ["AAPL", "Apple Inc.", "NASDAQ", "빅테크/하드웨어", "USD"],
    ["MSFT", "Microsoft Corp.", "NASDAQ", "빅테크/클라우드", "USD"],
    ["NVDA", "NVIDIA Corp.", "NASDAQ", "반도체/AI", "USD"],
    ["GOOGL", "Alphabet Inc. (A)", "NASDAQ", "빅테크/인터넷", "USD"],
    ["AMZN", "Amazon.com Inc.", "NASDAQ", "이커머스/클라우드", "USD"],
    ["META", "Meta Platforms Inc.", "NASDAQ", "빅테크/소셜", "USD"],
    ["TSLA", "Tesla Inc.", "NASDAQ", "전기차/에너지", "USD"],
    ["AVGO", "Broadcom Inc.", "NASDAQ", "반도체", "USD"],
    ["JPM", "JPMorgan Chase & Co.", "NYSE", "금융", "USD"],
    ["V", "Visa Inc.", "NYSE", "결제/핀테크", "USD"],
    ["UNH", "UnitedHealth Group", "NYSE", "헬스케어", "USD"],
    ["XOM", "Exxon Mobil Corp.", "NYSE", "에너지", "USD"],
    ["WMT", "Walmart Inc.", "NYSE", "유통", "USD"],
    ["MA", "Mastercard Inc.", "NYSE", "결제/핀테크", "USD"],
    ["PG", "Procter & Gamble", "NYSE", "생활소비재", "USD"],
    ["JNJ", "Johnson & Johnson", "NYSE", "헬스케어", "USD"],
    ["HD", "Home Depot Inc.", "NYSE", "유통/건축자재", "USD"],
    ["MRK", "Merck & Co.", "NYSE", "제약", "USD"],
    ["COST", "Costco Wholesale", "NASDAQ", "유통", "USD"],
    ["ORCL", "Oracle Corp.", "NYSE", "소프트웨어", "USD"],
    ["ABBV", "AbbVie Inc.", "NYSE", "제약", "USD"],
    ["CRM", "Salesforce Inc.", "NYSE", "소프트웨어/클라우드", "USD"],
    ["BAC", "Bank of America", "NYSE", "금융", "USD"],
    ["NFLX", "Netflix Inc.", "NASDAQ", "미디어/스트리밍", "USD"],
    ["AMD", "Advanced Micro Devices", "NASDAQ", "반도체", "USD"],
    ["KO", "Coca-Cola Co.", "NYSE", "음료/소비재", "USD"],
    ["PEP", "PepsiCo Inc.", "NASDAQ", "음료/소비재", "USD"],
    ["ADBE", "Adobe Inc.", "NASDAQ", "소프트웨어", "USD"],
    ["TMO", "Thermo Fisher Scientific", "NYSE", "헬스케어/장비", "USD"],
    ["DIS", "Walt Disney Co.", "NYSE", "미디어/엔터테인먼트", "USD"],
    ["MCD", "McDonald's Corp.", "NYSE", "외식", "USD"],
    ["CSCO", "Cisco Systems", "NASDAQ", "네트워크장비", "USD"],
    ["ABT", "Abbott Laboratories", "NYSE", "헬스케어", "USD"],
    ["WFC", "Wells Fargo & Co.", "NYSE", "금융", "USD"],
    ["INTC", "Intel Corp.", "NASDAQ", "반도체", "USD"],
    ["IBM", "IBM Corp.", "NYSE", "IT서비스", "USD"],
    ["QCOM", "Qualcomm Inc.", "NASDAQ", "반도체", "USD"],
    ["TXN", "Texas Instruments", "NASDAQ", "반도체", "USD"],
    ["INTU", "Intuit Inc.", "NASDAQ", "소프트웨어", "USD"],
    ["AMAT", "Applied Materials", "NASDAQ", "반도체장비", "USD"],
    ["CAT", "Caterpillar Inc.", "NYSE", "산업재/중장비", "USD"],
    ["PYPL", "PayPal Holdings", "NASDAQ", "핀테크/결제", "USD"],
    ["SBUX", "Starbucks Corp.", "NASDAQ", "외식/음료", "USD"],
    ["NKE", "Nike Inc.", "NYSE", "의류/스포츠", "USD"],
    ["LOW", "Lowe's Companies", "NYSE", "유통/건축자재", "USD"],
    ["GE", "GE Aerospace", "NYSE", "항공/산업재", "USD"],
    ["BA", "Boeing Co.", "NYSE", "항공기제조", "USD"],
    ["UPS", "United Parcel Service", "NYSE", "물류", "USD"],
    ["LMT", "Lockheed Martin", "NYSE", "방산", "USD"],
    ["RTX", "RTX Corp.", "NYSE", "방산/항공", "USD"],
    ["GS", "Goldman Sachs Group", "NYSE", "금융", "USD"],
    ["MS", "Morgan Stanley", "NYSE", "금융", "USD"],
    ["C", "Citigroup Inc.", "NYSE", "금융", "USD"],
    ["SCHW", "Charles Schwab", "NYSE", "금융", "USD"],
    ["BLK", "BlackRock Inc.", "NYSE", "자산운용", "USD"],
    ["SPGI", "S&P Global Inc.", "NYSE", "금융정보", "USD"],
    ["NOW", "ServiceNow Inc.", "NYSE", "소프트웨어", "USD"],
    ["PANW", "Palo Alto Networks", "NASDAQ", "사이버보안", "USD"],
    ["SNOW", "Snowflake Inc.", "NYSE", "소프트웨어/클라우드", "USD"],
    ["UBER", "Uber Technologies", "NYSE", "모빌리티", "USD"],
    ["ABNB", "Airbnb Inc.", "NASDAQ", "여행/플랫폼", "USD"],
    ["SHOP", "Shopify Inc.", "NYSE", "이커머스/소프트웨어", "USD"],
    ["BKNG", "Booking Holdings", "NASDAQ", "여행", "USD"],
    ["ISRG", "Intuitive Surgical", "NASDAQ", "의료기기", "USD"],
    ["GILD", "Gilead Sciences", "NASDAQ", "제약", "USD"],
    ["VRTX", "Vertex Pharmaceuticals", "NASDAQ", "제약", "USD"],
    ["REGN", "Regeneron Pharmaceuticals", "NASDAQ", "제약", "USD"],
    ["LIN", "Linde plc", "NASDAQ", "화학/산업가스", "USD"],
    ["HON", "Honeywell International", "NASDAQ", "산업재", "USD"],
    ["DE", "Deere & Co.", "NYSE", "농기계", "USD"],
    ["MMM", "3M Co.", "NYSE", "산업재", "USD"],
    ["T", "AT&T Inc.", "NYSE", "통신", "USD"],
    ["VZ", "Verizon Communications", "NYSE", "통신", "USD"],
    ["CMCSA", "Comcast Corp.", "NASDAQ", "미디어/통신", "USD"],
    ["PFE", "Pfizer Inc.", "NYSE", "제약", "USD"],
    ["CVX", "Chevron Corp.", "NYSE", "에너지", "USD"],
    ["SPY", "SPDR S&P 500 ETF Trust", "NYSE", "ETF(지수)", "USD"],
    ["QQQ", "Invesco QQQ Trust", "NASDAQ", "ETF(나스닥100)", "USD"],
    ["TQQQ", "ProShares UltraPro QQQ", "NASDAQ", "ETF(3배 레버리지)", "USD"],
    ["SOXL", "Direxion Daily Semiconductor Bull 3X", "NYSE", "ETF(반도체 3배)", "USD"],
    ["COIN", "Coinbase Global", "NASDAQ", "가상자산거래소", "USD"],
    ["PLTR", "Palantir Technologies", "NASDAQ", "소프트웨어/AI", "USD"],
    ["SQ", "Block Inc.", "NYSE", "핀테크/결제", "USD"],
    ["ADI", "Analog Devices", "NASDAQ", "반도체", "USD"],
    ["MU", "Micron Technology", "NASDAQ", "반도체", "USD"],
    ["LRCX", "Lam Research", "NASDAQ", "반도체장비", "USD"],
    ["KLAC", "KLA Corp.", "NASDAQ", "반도체장비", "USD"],
    ["ASML", "ASML Holding", "NASDAQ", "반도체장비", "USD"],
    ["CPNG", "Coupang Inc.", "NYSE", "이커머스", "USD"],
  ];

  const INDEX_SEED = [
    ["^KS11", "코스피"],
    ["^KQ11", "코스닥"],
    ["^GSPC", "S&P 500"],
    ["^IXIC", "나스닥"],
    ["KRW=X", "원/달러"],
  ];

  const STALE_MS = 9000; // don't re-fetch a symbol we already have a quote for younger than this
  const AUTO_REFRESH_MS = 10000; // re-poll currently visible + watchlisted symbols
  const INDEX_REFRESH_MS = 10000;
  const CHUNK_SIZE = 30; // typical visible-row count fits in a single batch
  const RISING_WINDOW = 6; // real ticks kept per symbol to judge a short-term uptrend
  const RISING_MIN_PCT = 0.001; // require at least +0.1% net move over the window
  const WATCHLIST_KEY = "marketWatchlist:v1";

  function makeEntry(symbol, name, market, sector, currency) {
    return {
      symbol,
      name,
      market,
      sector,
      currency,
      price: null,
      prevClose: null,
      changeAmt: null,
      changePct: null,
      volume: null,
      tradingValue: null,
      dayHigh: null,
      dayLow: null,
      weekHigh52: null,
      weekLow52: null,
      updatedAt: 0,
      error: null,
      recentPrices: [], // real fetched ticks only, oldest first
      isRising: false,
    };
  }

  function loadWatchlist() {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function saveWatchlist(set) {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...set]));
    } catch {
      // localStorage full/unavailable — watchlist just won't persist across reloads
    }
  }

  // "Rising" means the last few real fetched prices moved up without a drop
  // and the net change over that window clears a small noise threshold —
  // never a fabricated projection, only what was actually observed.
  function computeRising(points) {
    if (points.length < 3) return false;
    for (let i = 1; i < points.length; i++) {
      if (points[i].price < points[i - 1].price) return false;
    }
    const first = points[0].price;
    const last = points[points.length - 1].price;
    return last > first && (last - first) / first >= RISING_MIN_PCT;
  }

  const registry = new Map(
    SEED.map(([symbol, name, market, sector, currency]) => [symbol, makeEntry(symbol, name, market, sector, currency)])
  );

  const indexRegistry = new Map(
    INDEX_SEED.map(([symbol, label]) => [
      symbol,
      { symbol, label, price: null, changeAmt: null, changePct: null, updatedAt: 0 },
    ])
  );

  const subscribers = new Set();
  const indexSubscribers = new Set();
  const watchlistSubscribers = new Set();
  const signalSubscribers = new Set();
  const visibleSymbols = new Set();
  const watchlist = loadWatchlist();
  const inflight = new Set();
  let autoTimer = null;
  let indexTimer = null;

  function notify(updatedSymbols) {
    if (!updatedSymbols.length) return;
    subscribers.forEach((cb) => {
      try {
        cb({ changedSymbols: updatedSymbols });
      } catch {
        // one bad subscriber shouldn't break the refresh loop
      }
    });
  }

  function notifyIndexes() {
    indexSubscribers.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore
      }
    });
  }

  function notifyWatchlist() {
    watchlistSubscribers.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore
      }
    });
  }

  function notifySignal(entry) {
    signalSubscribers.forEach((cb) => {
      try {
        cb({ symbol: entry.symbol, name: entry.name, price: entry.price, changePct: entry.changePct });
      } catch {
        // ignore
      }
    });
  }

  function applyQuote(entry, quote) {
    entry.price = quote.price;
    entry.prevClose = quote.prevClose;
    entry.changeAmt = quote.changeAmt;
    entry.changePct = quote.changePct;
    entry.dayHigh = quote.dayHigh;
    entry.dayLow = quote.dayLow;
    entry.volume = quote.volume;
    entry.weekHigh52 = quote.weekHigh52;
    entry.weekLow52 = quote.weekLow52;
    entry.tradingValue = quote.volume != null && quote.price != null ? quote.volume * quote.price : null;
    entry.error = null;

    entry.recentPrices.push({ price: quote.price, t: Date.now() });
    if (entry.recentPrices.length > RISING_WINDOW) entry.recentPrices.shift();
    const wasRising = entry.isRising;
    entry.isRising = computeRising(entry.recentPrices);
    if (entry.isRising && !wasRising && watchlist.has(entry.symbol)) {
      notifySignal(entry);
    }
  }

  async function refreshSymbols(symbols) {
    const targets = [...new Set(symbols)].filter((s) => registry.has(s) && !inflight.has(s));
    if (!targets.length) return;
    targets.forEach((s) => inflight.add(s));

    const chunks = [];
    for (let i = 0; i < targets.length; i += CHUNK_SIZE) chunks.push(targets.slice(i, i + CHUNK_SIZE));

    // Chunks run concurrently (not one-at-a-time) — the visible+watchlist set
    // this is called with is already small, so this is what keeps first
    // paint of real numbers down to roughly a single proxy round trip.
    await Promise.all(
      chunks.map(async (chunk) => {
        let results;
        try {
          results = await window.StockData.fetchQuotesBatch(chunk);
        } catch {
          chunk.forEach((s) => inflight.delete(s));
          return;
        }
        const updated = [];
        chunk.forEach((symbol) => {
          inflight.delete(symbol);
          const entry = registry.get(symbol);
          const r = results.get(symbol);
          if (!entry || !r) return;
          entry.updatedAt = Date.now();
          if (r.error || !r.quote || r.quote.price == null) {
            entry.error = r.error || "시세 없음";
          } else {
            applyQuote(entry, r.quote);
          }
          updated.push(symbol);
        });
        notify(updated);
      })
    );
  }

  async function refreshIndexes() {
    const symbols = [...indexRegistry.keys()];
    let results;
    try {
      results = await window.StockData.fetchQuotesBatch(symbols);
    } catch {
      return;
    }
    symbols.forEach((symbol) => {
      const entry = indexRegistry.get(symbol);
      const r = results.get(symbol);
      if (!entry || !r || r.error || !r.quote || r.quote.price == null) return;
      entry.price = r.quote.price;
      entry.changeAmt = r.quote.changeAmt;
      entry.changePct = r.quote.changePct;
      entry.updatedAt = Date.now();
    });
    notifyIndexes();
  }

  function setVisibleSymbols(symbols) {
    visibleSymbols.clear();
    symbols.forEach((s) => visibleSymbols.add(s));
    const stale = symbols.filter((s) => {
      const entry = registry.get(s);
      return entry && (entry.price == null || Date.now() - entry.updatedAt > STALE_MS);
    });
    if (stale.length) refreshSymbols(stale);
  }

  function isWatched(symbol) {
    return watchlist.has(symbol);
  }

  function toggleWatch(symbol) {
    if (!registry.has(symbol)) return false;
    let nowWatched;
    if (watchlist.has(symbol)) {
      watchlist.delete(symbol);
      nowWatched = false;
    } else {
      watchlist.add(symbol);
      nowWatched = true;
      refreshSymbols([symbol]); // populate/refresh immediately so it doesn't sit blank
    }
    saveWatchlist(watchlist);
    notifyWatchlist();
    return nowWatched;
  }

  function getWatchlist() {
    return [...watchlist].map((s) => registry.get(s)).filter(Boolean);
  }

  // Watchlisted symbols stay live even when scrolled off-screen — that's
  // what lets the rising-signal detector actually watch them continuously.
  function start() {
    if (!autoTimer) {
      autoTimer = setInterval(() => {
        const targets = new Set([...visibleSymbols, ...watchlist]);
        if (targets.size) refreshSymbols([...targets]);
      }, AUTO_REFRESH_MS);
    }
    if (!indexTimer) {
      indexTimer = setInterval(refreshIndexes, INDEX_REFRESH_MS);
    }
    refreshIndexes();
    if (watchlist.size) refreshSymbols([...watchlist]);
  }

  function stop() {
    clearInterval(autoTimer);
    clearInterval(indexTimer);
    autoTimer = null;
    indexTimer = null;
  }

  function getUniverse() {
    return [...registry.values()];
  }

  function getStock(symbol) {
    return registry.get(symbol) || null;
  }

  function getIndexes() {
    return [...indexRegistry.values()];
  }

  function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function subscribeIndexes(callback) {
    indexSubscribers.add(callback);
    return () => indexSubscribers.delete(callback);
  }

  function subscribeWatchlist(callback) {
    watchlistSubscribers.add(callback);
    return () => watchlistSubscribers.delete(callback);
  }

  // Fired only when a *watchlisted* symbol's real ticks flip from flat/falling
  // to a short upward streak (see computeRising) — never a fabricated cue.
  function subscribeSignals(callback) {
    signalSubscribers.add(callback);
    return () => signalSubscribers.delete(callback);
  }

  return {
    start,
    stop,
    getUniverse,
    getStock,
    getIndexes,
    subscribe,
    subscribeIndexes,
    setVisibleSymbols,
    refreshSymbols,
    isWatched,
    toggleWatch,
    getWatchlist,
    subscribeWatchlist,
    subscribeSignals,
  };
})();
