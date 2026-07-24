/**
 * Mock real-time market data engine.
 *
 * No live API involved — this seeds a wide universe of REAL company names/
 * tickers with plausible approximate baseline prices, then simulates
 * tick-by-tick movement locally (random walk) to stand in for a WebSocket/SSE
 * feed. Everything rendered from this module must be labeled "모의 데이터"
 * in the UI; nothing here should ever be presented as a live quote.
 *
 * @typedef {Object} StockData
 * @property {string} symbol
 * @property {string} name
 * @property {"KOSPI"|"KOSDAQ"|"NASDAQ"|"NYSE"} market
 * @property {string} sector
 * @property {"KRW"|"USD"} currency
 * @property {number} price            현재가
 * @property {number} prevClose        전일 종가
 * @property {number} changeAmt        전일 대비 (원/달러)
 * @property {number} changePct        변동률 (%)
 * @property {number} volume           거래량 (주)
 * @property {number} tradingValue     거래대금 (currency 단위)
 * @property {number} dayHigh
 * @property {number} dayLow
 * @property {number} weekHigh52
 * @property {number} weekLow52
 * @property {number} sharesOutstanding 발행주식수 (시가총액 계산용, 근사치)
 * @property {number} per              주가수익비율 (근사치)
 * @property {number} pbr              주가순자산비율 (근사치)
 * @property {number} dividendYield    배당수익률 % (근사치)
 *
 * @typedef {Object} MarketIndex
 * @property {string} symbol
 * @property {string} label
 * @property {number} price
 * @property {number} changeAmt
 * @property {number} changePct
 *
 * @typedef {Object} OrderBookLevel
 * @property {number} price
 * @property {number} qty
 */

window.MarketMock = (() => {
  // symbol, name, market, sector, currency, basePrice, sharesOutstanding(억주 단위 근사), per, pbr, divYield
  const SEED = [
    // --- KOSPI ---
    ["005930.KS", "삼성전자", "KOSPI", "반도체/전자", "KRW", 71200, 59.7, 14.2, 1.1, 2.1],
    ["000660.KS", "SK하이닉스", "KOSPI", "반도체", "KRW", 189000, 7.3, 9.8, 1.9, 0.6],
    ["373220.KS", "LG에너지솔루션", "KOSPI", "2차전지", "KRW", 412000, 2.4, 45.1, 3.2, 0.1],
    ["207940.KS", "삼성바이오로직스", "KOSPI", "바이오/CDMO", "KRW", 987000, 0.7, 58.3, 5.4, 0.0],
    ["005380.KS", "현대차", "KOSPI", "자동차", "KRW", 246000, 1.4, 5.8, 0.6, 4.8],
    ["000270.KS", "기아", "KOSPI", "자동차", "KRW", 118500, 4.0, 4.9, 0.9, 4.2],
    ["035420.KS", "NAVER", "KOSPI", "인터넷/플랫폼", "KRW", 198500, 1.6, 21.4, 1.5, 0.6],
    ["035720.KS", "카카오", "KOSPI", "인터넷/플랫폼", "KRW", 41200, 4.4, 38.7, 0.9, 0.4],
    ["006400.KS", "삼성SDI", "KOSPI", "2차전지", "KRW", 341000, 0.7, 32.1, 1.4, 0.5],
    ["005490.KS", "POSCO홀딩스", "KOSPI", "철강", "KRW", 389000, 0.9, 19.2, 0.5, 2.1],
    ["051910.KS", "LG화학", "KOSPI", "화학/배터리소재", "KRW", 342000, 0.7, 24.5, 0.8, 1.5],
    ["068270.KS", "셀트리온", "KOSPI", "바이오", "KRW", 178300, 4.4, 41.2, 3.1, 0.0],
    ["028260.KS", "삼성물산", "KOSPI", "지주/상사", "KRW", 149800, 1.9, 11.3, 0.8, 2.6],
    ["105560.KS", "KB금융", "KOSPI", "금융", "KRW", 92300, 3.4, 6.1, 0.6, 4.9],
    ["055550.KS", "신한지주", "KOSPI", "금융", "KRW", 55600, 3.6, 5.8, 0.5, 5.1],
    ["012330.KS", "현대모비스", "KOSPI", "자동차부품", "KRW", 254000, 0.9, 6.4, 0.5, 3.4],
    ["086790.KS", "하나금융지주", "KOSPI", "금융", "KRW", 68400, 2.6, 5.2, 0.5, 5.6],
    ["066570.KS", "LG전자", "KOSPI", "가전/전자", "KRW", 97800, 1.6, 10.9, 0.9, 1.3],
    ["015760.KS", "한국전력", "KOSPI", "유틸리티", "KRW", 22450, 6.4, 8.7, 0.3, 0.0],
    ["096770.KS", "SK이노베이션", "KOSPI", "에너지/배터리", "KRW", 118200, 0.9, 14.6, 0.6, 1.0],
    ["032830.KS", "삼성생명", "KOSPI", "보험", "KRW", 98700, 2.0, 7.9, 0.6, 4.1],
    ["316140.KS", "우리금융지주", "KOSPI", "금융", "KRW", 17650, 6.8, 4.9, 0.4, 6.8],
    ["017670.KS", "SK텔레콤", "KOSPI", "통신", "KRW", 58900, 0.7, 10.2, 1.1, 6.3],
    ["033780.KS", "KT&G", "KOSPI", "담배/헬스케어", "KRW", 104200, 1.4, 13.1, 1.7, 4.9],
    ["003670.KS", "포스코퓨처엠", "KOSPI", "배터리소재", "KRW", 231000, 0.9, 72.4, 3.1, 0.1],
    ["009830.KS", "한화솔루션", "KOSPI", "화학/태양광", "KRW", 24300, 1.9, 15.3, 0.9, 1.2],
    ["034220.KS", "LG디스플레이", "KOSPI", "디스플레이", "KRW", 12450, 4.6, 0, 0.9, 0.0],
    ["000810.KS", "삼성화재", "KOSPI", "보험", "KRW", 328000, 0.5, 9.1, 0.9, 4.6],
    ["010950.KS", "S-Oil", "KOSPI", "정유", "KRW", 68200, 1.8, 12.7, 0.8, 3.5],
    ["034020.KS", "두산에너빌리티", "KOSPI", "에너지설비", "KRW", 21800, 6.4, 36.2, 2.4, 0.2],
    ["009540.KS", "HD한국조선해양", "KOSPI", "조선", "KRW", 189500, 0.7, 15.8, 2.1, 0.7],
    ["259960.KS", "크래프톤", "KOSPI", "게임", "KRW", 289000, 0.5, 17.3, 2.5, 0.9],
    ["323410.KS", "카카오뱅크", "KOSPI", "인터넷은행", "KRW", 24800, 4.8, 16.4, 1.7, 0.9],
    ["377300.KS", "카카오페이", "KOSPI", "핀테크", "KRW", 38200, 0.9, 0, 3.1, 0.0],
    ["011200.KS", "HMM", "KOSPI", "해운", "KRW", 18900, 6.9, 4.2, 0.9, 0.0],
    ["090430.KS", "아모레퍼시픽", "KOSPI", "화장품", "KRW", 148500, 0.6, 28.9, 1.5, 0.6],
    ["011170.KS", "롯데케미칼", "KOSPI", "화학", "KRW", 89600, 0.3, 0, 0.4, 0.0],
    ["042700.KS", "한미반도체", "KOSPI", "반도체장비", "KRW", 138000, 1.4, 42.1, 8.9, 0.4],
    ["003490.KS", "대한항공", "KOSPI", "항공", "KRW", 24600, 3.0, 6.8, 1.3, 0.4],
    ["021240.KS", "코웨이", "KOSPI", "생활가전", "KRW", 68300, 0.7, 12.4, 2.6, 3.8],
    ["051900.KS", "LG생활건강", "KOSPI", "화장품/생활용품", "KRW", 328000, 0.2, 21.5, 1.2, 1.9],
    ["006360.KS", "GS건설", "KOSPI", "건설", "KRW", 21400, 1.0, 0, 0.6, 0.0],
    ["302440.KS", "SK바이오사이언스", "KOSPI", "백신/바이오", "KRW", 68500, 0.8, 0, 3.2, 0.0],
    ["251270.KS", "넷마블", "KOSPI", "게임", "KRW", 58200, 0.9, 0, 1.6, 0.0],
    ["036570.KS", "엔씨소프트", "KOSPI", "게임", "KRW", 178500, 0.2, 32.6, 1.3, 1.7],
    ["004020.KS", "현대제철", "KOSPI", "철강", "KRW", 28900, 1.3, 0, 0.3, 1.7],
    ["139480.KS", "이마트", "KOSPI", "유통", "KRW", 62800, 0.3, 0, 0.3, 2.4],
    ["097950.KS", "CJ제일제당", "KOSPI", "식품", "KRW", 289000, 0.2, 15.8, 0.8, 1.7],
    ["009150.KS", "삼성전기", "KOSPI", "전자부품", "KRW", 148900, 0.9, 18.9, 1.4, 0.9],
    ["402340.KS", "SK스퀘어", "KOSPI", "투자지주", "KRW", 112400, 0.8, 0, 1.1, 0.0],

    // --- KOSDAQ ---
    ["086520.KQ", "에코프로", "KOSDAQ", "2차전지소재", "KRW", 78200, 0.5, 68.4, 4.8, 0.1],
    ["247540.KQ", "에코프로비엠", "KOSDAQ", "2차전지소재", "KRW", 118000, 0.5, 0, 4.1, 0.0],
    ["196170.KQ", "알테오젠", "KOSDAQ", "바이오", "KRW", 328000, 0.4, 0, 22.4, 0.0],
    ["028300.KQ", "HLB", "KOSDAQ", "바이오", "KRW", 68900, 1.2, 0, 8.9, 0.0],
    ["068760.KQ", "셀트리온제약", "KOSDAQ", "제약", "KRW", 89500, 0.4, 0, 3.6, 0.0],
    ["214150.KQ", "클래시스", "KOSDAQ", "의료기기", "KRW", 48200, 0.5, 28.9, 8.1, 1.3],
    ["141080.KQ", "리가켐바이오", "KOSDAQ", "바이오", "KRW", 118500, 0.3, 0, 6.4, 0.0],
    ["214450.KQ", "파마리서치", "KOSDAQ", "바이오/미용", "KRW", 268000, 0.1, 32.1, 8.9, 0.4],
    ["263750.KQ", "펄어비스", "KOSDAQ", "게임", "KRW", 38900, 0.4, 0, 3.1, 0.0],
    ["253450.KQ", "스튜디오드래곤", "KOSDAQ", "콘텐츠", "KRW", 62800, 0.6, 42.6, 1.8, 0.0],
    ["035900.KQ", "JYP Ent.", "KOSDAQ", "엔터테인먼트", "KRW", 68200, 0.5, 21.3, 5.9, 1.1],
    ["041510.KQ", "에스엠", "KOSDAQ", "엔터테인먼트", "KRW", 89100, 0.2, 24.8, 2.6, 1.3],
    ["122870.KQ", "와이지엔터테인먼트", "KOSDAQ", "엔터테인먼트", "KRW", 58900, 0.2, 0, 2.9, 0.0],
    ["277810.KQ", "레인보우로보틱스", "KOSDAQ", "로봇", "KRW", 198500, 0.2, 0, 24.1, 0.0],
    ["365340.KQ", "성일하이텍", "KOSDAQ", "2차전지 리사이클", "KRW", 48200, 0.3, 0, 3.8, 0.0],

    // --- NASDAQ / NYSE ---
    ["AAPL", "Apple Inc.", "NASDAQ", "빅테크/하드웨어", "USD", 234.5, 152, 32.4, 48.2, 0.5],
    ["MSFT", "Microsoft Corp.", "NASDAQ", "빅테크/클라우드", "USD", 428.7, 74.3, 35.1, 11.8, 0.7],
    ["NVDA", "NVIDIA Corp.", "NASDAQ", "반도체/AI", "USD", 138.2, 245, 62.8, 45.6, 0.03],
    ["GOOGL", "Alphabet Inc. (A)", "NASDAQ", "빅테크/인터넷", "USD", 172.4, 121, 24.1, 6.8, 0.4],
    ["AMZN", "Amazon.com Inc.", "NASDAQ", "이커머스/클라우드", "USD", 198.3, 104, 42.6, 8.1, 0.0],
    ["META", "Meta Platforms Inc.", "NASDAQ", "빅테크/소셜", "USD", 592.1, 25.5, 27.3, 8.9, 0.3],
    ["TSLA", "Tesla Inc.", "NASDAQ", "전기차/에너지", "USD", 342.8, 32.2, 118.4, 14.2, 0.0],
    ["AVGO", "Broadcom Inc.", "NASDAQ", "반도체", "USD", 178.9, 46.9, 38.9, 16.8, 1.2],
    ["JPM", "JPMorgan Chase & Co.", "NYSE", "금융", "USD", 238.6, 28.4, 12.6, 2.1, 2.1],
    ["V", "Visa Inc.", "NYSE", "결제/핀테크", "USD", 318.4, 20.1, 31.2, 15.9, 0.7],
    ["UNH", "UnitedHealth Group", "NYSE", "헬스케어", "USD", 512.3, 9.2, 18.9, 4.6, 1.8],
    ["XOM", "Exxon Mobil Corp.", "NYSE", "에너지", "USD", 118.2, 41.9, 13.8, 2.1, 3.4],
    ["WMT", "Walmart Inc.", "NYSE", "유통", "USD", 92.4, 800.0, 38.6, 8.4, 0.9],
    ["MA", "Mastercard Inc.", "NYSE", "결제/핀테크", "USD", 528.7, 9.2, 36.8, 68.9, 0.5],
    ["PG", "Procter & Gamble", "NYSE", "생활소비재", "USD", 168.9, 231, 26.4, 8.1, 2.3],
    ["JNJ", "Johnson & Johnson", "NYSE", "헬스케어", "USD", 158.2, 241, 16.8, 5.6, 3.1],
    ["HD", "Home Depot Inc.", "NYSE", "유통/건축자재", "USD", 398.6, 99.6, 25.9, 68.4, 2.2],
    ["MRK", "Merck & Co.", "NYSE", "제약", "USD", 98.4, 250, 14.2, 4.8, 3.4],
    ["COST", "Costco Wholesale", "NASDAQ", "유통", "USD", 928.3, 44.3, 52.1, 16.8, 0.5],
    ["ORCL", "Oracle Corp.", "NYSE", "소프트웨어", "USD", 168.9, 274, 38.9, 42.1, 0.9],
    ["ABBV", "AbbVie Inc.", "NYSE", "제약", "USD", 178.6, 176, 62.4, 28.9, 3.2],
    ["CRM", "Salesforce Inc.", "NYSE", "소프트웨어/클라우드", "USD", 318.4, 95.6, 48.9, 4.1, 0.5],
    ["BAC", "Bank of America", "NYSE", "금융", "USD", 42.8, 786, 13.9, 1.2, 2.4],
    ["NFLX", "Netflix Inc.", "NASDAQ", "미디어/스트리밍", "USD", 892.4, 43.0, 42.6, 16.8, 0.0],
    ["AMD", "Advanced Micro Devices", "NASDAQ", "반도체", "USD", 128.9, 161, 98.4, 3.8, 0.0],
    ["KO", "Coca-Cola Co.", "NYSE", "음료/소비재", "USD", 68.9, 431, 26.8, 12.1, 2.8],
    ["PEP", "PepsiCo Inc.", "NASDAQ", "음료/소비재", "USD", 148.2, 138, 22.4, 9.8, 3.6],
    ["ADBE", "Adobe Inc.", "NASDAQ", "소프트웨어", "USD", 428.6, 43.5, 28.9, 11.4, 0.0],
    ["TMO", "Thermo Fisher Scientific", "NYSE", "헬스케어/장비", "USD", 528.9, 37.9, 32.6, 4.1, 0.2],
    ["DIS", "Walt Disney Co.", "NYSE", "미디어/엔터테인먼트", "USD", 108.4, 180, 28.9, 1.9, 0.9],
    ["MCD", "McDonald's Corp.", "NYSE", "외식", "USD", 298.6, 71.6, 25.4, 41.2, 2.3],
    ["CSCO", "Cisco Systems", "NASDAQ", "네트워크장비", "USD", 58.9, 388, 18.6, 4.8, 2.6],
    ["ABT", "Abbott Laboratories", "NYSE", "헬스케어", "USD", 118.6, 173, 32.1, 5.4, 1.9],
    ["WFC", "Wells Fargo & Co.", "NYSE", "금융", "USD", 68.9, 328, 13.6, 1.6, 2.2],
    ["INTC", "Intel Corp.", "NASDAQ", "반도체", "USD", 22.8, 424, 0, 0.9, 0.0],
    ["IBM", "IBM Corp.", "NYSE", "IT서비스", "USD", 228.6, 92.0, 28.9, 8.6, 2.9],
    ["QCOM", "Qualcomm Inc.", "NASDAQ", "반도체", "USD", 168.4, 108, 18.6, 6.8, 1.9],
    ["TXN", "Texas Instruments", "NASDAQ", "반도체", "USD", 198.6, 90.6, 32.6, 11.4, 2.7],
    ["INTU", "Intuit Inc.", "NASDAQ", "소프트웨어", "USD", 628.9, 27.9, 58.9, 12.1, 0.5],
    ["AMAT", "Applied Materials", "NASDAQ", "반도체장비", "USD", 178.6, 80.6, 22.4, 8.9, 0.8],
    ["CAT", "Caterpillar Inc.", "NYSE", "산업재/중장비", "USD", 368.9, 48.3, 16.8, 8.9, 1.5],
  ];

  /** @returns {StockData[]} */
  function buildInitialUniverse() {
    return SEED.map(([symbol, name, market, sector, currency, basePrice, sharesEok, per, pbr, divYield]) => {
      const sharesOutstanding = sharesEok * 1e8;
      const volume = Math.round(basePrice > 0 ? (5e10 / basePrice) * (0.4 + Math.random() * 1.2) : 0);
      return {
        symbol,
        name,
        market,
        sector,
        currency,
        price: basePrice,
        prevClose: basePrice,
        changeAmt: 0,
        changePct: 0,
        volume,
        tradingValue: volume * basePrice,
        dayHigh: basePrice,
        dayLow: basePrice,
        weekHigh52: Math.round(basePrice * (1.15 + Math.random() * 0.25) * 100) / 100,
        weekLow52: Math.round(basePrice * (0.55 + Math.random() * 0.2) * 100) / 100,
        sharesOutstanding,
        per,
        pbr,
        dividendYield: divYield,
      };
    });
  }

  const INDEX_SEED = [
    { symbol: "KOSPI", label: "코스피", base: 2650.3 },
    { symbol: "KOSDAQ", label: "코스닥", base: 865.1 },
    { symbol: "SPX", label: "S&P 500", base: 5850.2 },
    { symbol: "NASDAQ", label: "나스닥", base: 18500.6 },
    { symbol: "USDKRW", label: "원/달러", base: 1390.5 },
  ];

  /** @type {Map<string, StockData>} */
  const universe = new Map(buildInitialUniverse().map((s) => [s.symbol, s]));
  /** @type {Map<string, MarketIndex>} */
  const indexes = new Map(INDEX_SEED.map((i) => [i.symbol, { symbol: i.symbol, label: i.label, price: i.base, changeAmt: 0, changePct: 0 }]));

  const subscribers = new Set();
  let timer = null;

  function randomStep(price) {
    // Small gaussian-ish jitter per tick, roughly ±0.4% typical, occasional larger moves.
    const u1 = Math.random() || 1e-6;
    const u2 = Math.random();
    const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const pct = gaussian * 0.0018;
    return price * (1 + pct);
  }

  function tick() {
    const changedSymbols = [];

    universe.forEach((stock, symbol) => {
      const next = Math.max(0.01, randomStep(stock.price));
      const rounded = stock.currency === "KRW" ? Math.round(next) : Math.round(next * 100) / 100;
      if (rounded === stock.price) return;

      stock.price = rounded;
      stock.changeAmt = Math.round((stock.price - stock.prevClose) * 100) / 100;
      stock.changePct = (stock.changeAmt / stock.prevClose) * 100;
      stock.dayHigh = Math.max(stock.dayHigh, stock.price);
      stock.dayLow = Math.min(stock.dayLow, stock.price);
      stock.weekHigh52 = Math.max(stock.weekHigh52, stock.price);
      stock.weekLow52 = Math.min(stock.weekLow52, stock.price);
      const tradeQty = Math.round(50 + Math.random() * 2000);
      stock.volume += tradeQty;
      stock.tradingValue += tradeQty * stock.price;
      changedSymbols.push(symbol);
    });

    indexes.forEach((idx) => {
      const next = randomStep(idx.price);
      idx.changeAmt = Math.round((next - idx.price) * 100) / 100;
      idx.price = Math.round(next * 100) / 100;
      idx.changePct = (idx.changeAmt / (idx.price - idx.changeAmt)) * 100;
    });

    subscribers.forEach((cb) => {
      try {
        cb({ changedSymbols });
      } catch {
        // one bad subscriber shouldn't stop the tick loop
      }
    });
  }

  function start(intervalMs = 1500) {
    if (timer) return;
    timer = setInterval(tick, intervalMs);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  /** @returns {StockData[]} */
  function getUniverse() {
    return [...universe.values()];
  }

  /** @param {string} symbol @returns {StockData|undefined} */
  function getStock(symbol) {
    return universe.get(symbol);
  }

  /** @returns {MarketIndex[]} */
  function getIndexes() {
    return [...indexes.values()];
  }

  /** @param {string} symbol @param {number} levels @returns {{bids: OrderBookLevel[], asks: OrderBookLevel[]}} */
  function getOrderBook(symbol, levels = 8) {
    const stock = universe.get(symbol);
    if (!stock) return { bids: [], asks: [] };
    const tick_ = stock.currency === "KRW" ? Math.max(1, Math.round(stock.price * 0.0005)) : Math.max(0.01, stock.price * 0.0008);
    const bids = [];
    const asks = [];
    for (let i = 1; i <= levels; i++) {
      bids.push({ price: Math.round((stock.price - tick_ * i) * 100) / 100, qty: Math.round(50 + Math.random() * 3000) });
      asks.push({ price: Math.round((stock.price + tick_ * i) * 100) / 100, qty: Math.round(50 + Math.random() * 3000) });
    }
    return { bids, asks };
  }

  /** @param {(payload: {changedSymbols: string[]}) => void} callback */
  function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  return { start, stop, getUniverse, getStock, getIndexes, getOrderBook, subscribe };
})();
