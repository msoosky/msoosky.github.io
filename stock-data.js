window.StockData = (() => {
  const CURATED_STOCKS = [
    {
      symbol: "005930.KS",
      nameKo: "삼성전자",
      market: "KOSPI",
      sector: "반도체/전자",
      description:
        "메모리반도체 세계 1위이자 스마트폰, 가전까지 아우르는 국내 최대 시가총액 기업입니다.",
      reasons: [
        "메모리(D램·낸드) 글로벌 1위 지위와 압도적 규모의 경제",
        "반도체·모바일·가전으로 분산된 사업 포트폴리오",
        "국내 대표 배당주로 꾸준한 주주환원 정책",
      ],
    },
    {
      symbol: "000660.KS",
      nameKo: "SK하이닉스",
      market: "KOSPI",
      sector: "반도체",
      description: "메모리반도체 전문 기업으로 AI 서버용 고대역폭메모리(HBM) 선두주자입니다.",
      reasons: [
        "AI 서버 확산에 따른 HBM 수요 급증의 최대 수혜 기업 중 하나",
        "메모리 업황 회복기 이익 레버리지가 큰 구조",
        "글로벌 빅테크와의 장기 공급 관계",
      ],
    },
    {
      symbol: "373220.KS",
      nameKo: "LG에너지솔루션",
      market: "KOSPI",
      sector: "2차전지",
      description: "전기차·ESS용 배터리를 생산하는 글로벌 2차전지 선두 기업입니다.",
      reasons: [
        "전기차 전환이라는 장기 구조적 성장 산업에 위치",
        "북미·유럽 완성차 업체와의 대규모 장기 공급 계약",
        "미국 IRA 등 정책 수혜가 가능한 현지 생산 거점 확대",
      ],
    },
    {
      symbol: "207940.KS",
      nameKo: "삼성바이오로직스",
      market: "KOSPI",
      sector: "바이오/CDMO",
      description: "글로벌 제약사의 바이오의약품을 위탁생산하는 CDMO 세계 최대 규모 기업입니다.",
      reasons: [
        "바이오의약품 위탁생산 세계 최대 캐파 보유",
        "고령화에 따른 바이오의약품 시장 장기 성장 수혜",
        "대형 제약사와의 장기 위탁생산 계약 기반 안정적 수주",
      ],
    },
    {
      symbol: "005380.KS",
      nameKo: "현대차",
      market: "KOSPI",
      sector: "자동차",
      description: "내연기관부터 전기차까지 아우르는 글로벌 완성차 제조사입니다.",
      reasons: [
        "글로벌 판매 상위권의 완성차 브랜드 경쟁력",
        "전기차·수소차 등 미래 모빌리티 투자 확대",
        "상대적으로 낮은 밸류에이션과 높은 배당수익률",
      ],
    },
    {
      symbol: "035420.KS",
      nameKo: "NAVER",
      market: "KOSPI",
      sector: "인터넷/플랫폼",
      description: "검색·커머스·콘텐츠·AI를 아우르는 국내 대표 인터넷 플랫폼 기업입니다.",
      reasons: [
        "국내 검색·커머스 시장에서의 확고한 플랫폼 지배력",
        "웹툰 등 콘텐츠 사업의 글로벌 확장",
        "자체 AI 모델 투자로 신규 성장동력 확보 시도",
      ],
    },
    {
      symbol: "AAPL",
      nameKo: "애플",
      market: "NASDAQ",
      sector: "빅테크/하드웨어",
      description: "아이폰을 중심으로 강력한 브랜드와 생태계를 보유한 글로벌 빅테크입니다.",
      reasons: [
        "높은 충성도의 사용자 기반과 강력한 브랜드 파워",
        "하드웨어에서 서비스로 확장되는 고마진 수익 구조",
        "꾸준한 자사주 매입으로 주주환원에 적극적",
      ],
    },
    {
      symbol: "MSFT",
      nameKo: "마이크로소프트",
      market: "NASDAQ",
      sector: "빅테크/클라우드",
      description: "클라우드(Azure)와 오피스 소프트웨어를 양대 축으로 하는 글로벌 소프트웨어 기업입니다.",
      reasons: [
        "클라우드·구독형 소프트웨어 중심의 안정적 반복 매출 구조",
        "AI(오픈AI 파트너십 등) 관련 투자와 제품 통합에 적극적",
        "우량한 재무구조와 꾸준한 배당 성장",
      ],
    },
    {
      symbol: "NVDA",
      nameKo: "엔비디아",
      market: "NASDAQ",
      sector: "반도체/AI",
      description: "AI 연산에 필수적인 GPU 시장을 사실상 주도하는 반도체 기업입니다.",
      reasons: [
        "AI 인프라 투자 확대의 최대 수혜 기업으로 꼽힘",
        "GPU·소프트웨어(CUDA) 생태계로 형성된 높은 진입장벽",
        "데이터센터向 매출 비중 확대에 따른 고성장",
      ],
    },
    {
      symbol: "GOOGL",
      nameKo: "알파벳(구글)",
      market: "NASDAQ",
      sector: "빅테크/인터넷",
      description: "검색·유튜브·클라우드·AI를 보유한 글로벌 인터넷 플랫폼 기업입니다.",
      reasons: [
        "압도적인 글로벌 검색시장 점유율 기반의 광고 수익",
        "유튜브·클라우드 등 다각화된 성장 사업 보유",
        "자체 AI 모델(제미나이) 및 데이터센터 인프라 투자",
      ],
    },
    {
      symbol: "AMZN",
      nameKo: "아마존",
      market: "NASDAQ",
      sector: "이커머스/클라우드",
      description: "세계 최대 이커머스 기업이자 클라우드(AWS) 시장 1위 기업입니다.",
      reasons: [
        "이커머스 물류망 규모의 경제로 형성된 강력한 진입장벽",
        "고마진 사업인 AWS(클라우드) 부문의 안정적 이익 기여",
        "광고 사업 등 신규 수익원의 빠른 성장",
      ],
    },
    {
      symbol: "TSLA",
      nameKo: "테슬라",
      market: "NASDAQ",
      sector: "전기차/에너지",
      description: "전기차와 에너지 저장, 자율주행 기술을 개발하는 혁신 기업입니다.",
      reasons: [
        "전기차 시장 초기 진입으로 확보한 브랜드·기술 선점 효과",
        "자율주행·로보틱스 등 장기적 신사업 확장 가능성",
        "다만 밸류에이션 변동성이 크므로 분할 매수 등 리스크 관리 필요",
      ],
    },
  ];

  const PROXIES = [
    (target) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(target),
    (target) => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(target),
    (target) => "https://api.cors.lol/?url=" + encodeURIComponent(target),
  ];

  const memCache = new Map();
  const CHART_TTL_MS = 15 * 60 * 1000;
  const QUOTE_TTL_MS = 45 * 1000;
  const SESSION_PREFIX = "stockCache:";

  function fetchWithTimeout(url, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  // Fires every proxy in parallel and resolves with whichever responds first,
  // instead of waiting through each one sequentially — this is the main lever
  // on perceived load time since a single proxy can be slow/unreliable.
  function raceProxies(target, timeoutMs) {
    return new Promise((resolve, reject) => {
      let remaining = PROXIES.length;
      let settled = false;
      const errors = [];

      PROXIES.forEach((buildProxyUrl, i) => {
        fetchWithTimeout(buildProxyUrl(target), timeoutMs)
          .then(async (res) => {
            if (!res.ok) throw new Error("HTTP " + res.status);
            const json = await res.json();
            if (!settled) {
              settled = true;
              resolve(json);
            }
          })
          .catch((err) => {
            errors[i] = (err && err.name === "AbortError" ? "timeout" : err?.message) || "error";
            remaining -= 1;
            if (remaining === 0 && !settled) {
              console.warn("[StockData] all proxies failed for", target, errors);
              reject(new Error(errors[0] || "모든 프록시 요청 실패"));
            }
          });
      });
    });
  }

  function readCache(key, ttlMs) {
    const inMem = memCache.get(key);
    if (inMem && Date.now() - inMem.time < ttlMs) return inMem.data;

    try {
      const raw = sessionStorage.getItem(SESSION_PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.time >= ttlMs) return null;
      const data = reviveDates(parsed.data);
      memCache.set(key, { time: parsed.time, data });
      return data;
    } catch {
      return null;
    }
  }

  function writeCache(key, data) {
    const entry = { time: Date.now(), data };
    memCache.set(key, entry);
    try {
      sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(entry));
    } catch {
      // sessionStorage full/unavailable — in-memory cache still works for this tab session
    }
  }

  function reviveDates(data) {
    if (!data || !Array.isArray(data.series)) return data;
    return { ...data, series: data.series.map((p) => ({ date: new Date(p.date), close: p.close })) };
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchChartJson(symbol, range, interval, timeoutMs) {
    const target =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      encodeURIComponent(symbol) +
      "?range=" +
      range +
      "&interval=" +
      interval;

    // Free public proxies occasionally rate-limit or blip — one retry after
    // a short pause clears most transient failures without much added latency.
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await wait(1200);
      try {
        const json = await raceProxies(target, timeoutMs);
        const result = json?.chart?.result?.[0];
        if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
          throw new Error("종목 데이터를 찾을 수 없습니다");
        }
        return result;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  }

  async function fetchYahooChart(symbol, range = "5y", interval = "1d") {
    const cacheKey = "chart|" + symbol + "|" + range + "|" + interval;
    const cached = readCache(cacheKey, CHART_TTL_MS);
    if (cached) return cached;

    try {
      const result = await fetchChartJson(symbol, range, interval, 12000);
      const parsed = parseChartResult(result);
      writeCache(cacheKey, parsed);
      return parsed;
    } catch (err) {
      throw new Error("주가 데이터를 불러오지 못했습니다: " + (err?.message || "알 수 없는 오류"));
    }
  }

  // Lightweight quote for dashboard/watchlist rows: small payload (5 daily
  // points, mainly reading `meta`), short TTL so auto-refresh stays current.
  async function fetchQuote(symbol) {
    const cacheKey = "quote|" + symbol;
    const cached = readCache(cacheKey, QUOTE_TTL_MS);
    if (cached) return cached;

    try {
      const result = await fetchChartJson(symbol, "5d", "1d", 9000);
      const quote = parseQuote(result);
      writeCache(cacheKey, quote);
      return quote;
    } catch (err) {
      throw new Error("시세를 불러오지 못했습니다: " + (err?.message || "알 수 없는 오류"));
    }
  }

  // Fetches all symbols in parallel; failed ones resolve to {symbol, error}
  // instead of rejecting the whole batch, so one bad ticker doesn't block the rest.
  async function fetchQuotesBatch(symbols) {
    const unique = [...new Set(symbols)];
    const results = await Promise.all(
      unique.map((symbol) =>
        fetchQuote(symbol)
          .then((quote) => ({ symbol, quote, error: null }))
          .catch((err) => ({ symbol, quote: null, error: err.message }))
      )
    );
    const map = new Map();
    results.forEach((r) => map.set(r.symbol, r));
    return map;
  }

  function parseChartResult(result) {
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const series = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      series.push({ date: new Date(timestamps[i] * 1000), close: closes[i] });
    }
    series.sort((a, b) => a.date - b.date);
    return {
      symbol: result.meta.symbol,
      name: result.meta.longName || result.meta.shortName || result.meta.symbol,
      currency: result.meta.currency || "USD",
      series,
    };
  }

  function parseQuote(result) {
    const m = result.meta;
    const price = m.regularMarketPrice;
    const prevClose = m.chartPreviousClose ?? m.previousClose;
    const changeAmt = price != null && prevClose != null ? price - prevClose : null;
    const changePct = price != null && prevClose ? (changeAmt / prevClose) * 100 : null;
    return {
      symbol: m.symbol,
      name: m.longName || m.shortName || m.symbol,
      currency: m.currency || "USD",
      price,
      prevClose,
      changeAmt,
      changePct,
      dayHigh: m.regularMarketDayHigh ?? null,
      dayLow: m.regularMarketDayLow ?? null,
      volume: m.regularMarketVolume ?? null,
      weekHigh52: m.fiftyTwoWeekHigh ?? null,
      weekLow52: m.fiftyTwoWeekLow ?? null,
    };
  }

  function nearestOnOrBefore(series, targetDate) {
    let candidate = null;
    for (const point of series) {
      if (point.date <= targetDate) candidate = point;
      else break;
    }
    return candidate;
  }

  function nearestOnOrAfter(series, targetDate) {
    for (const point of series) {
      if (point.date >= targetDate) return point;
    }
    return null;
  }

  function periodChange(series, days) {
    if (!series.length) return null;
    const latest = series[series.length - 1];
    const targetDate = new Date(latest.date.getTime() - days * 86400000);
    if (series[0].date > targetDate) return null;
    const past = nearestOnOrBefore(series, targetDate);
    if (!past || past === latest) return null;
    const changePct = ((latest.close - past.close) / past.close) * 100;
    return { changePct, fromDate: past.date, fromClose: past.close, toDate: latest.date, toClose: latest.close };
  }

  function formatPrice(value, currency) {
    if (value == null || Number.isNaN(value)) return "-";
    if (currency === "KRW") {
      return Math.round(value).toLocaleString("ko-KR") + "원";
    }
    return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(value) {
    if (value == null || Number.isNaN(value)) return "-";
    const sign = value > 0 ? "+" : "";
    return sign + value.toFixed(2) + "%";
  }

  const MARKET_INDEXES = [
    { symbol: "^KS11", label: "코스피 (KOSPI)" },
    { symbol: "^KQ11", label: "코스닥 (KOSDAQ)" },
    { symbol: "^GSPC", label: "S&P 500" },
    { symbol: "^IXIC", label: "나스닥 (NASDAQ)" },
  ];

  return {
    CURATED_STOCKS,
    MARKET_INDEXES,
    fetchYahooChart,
    fetchQuote,
    fetchQuotesBatch,
    nearestOnOrBefore,
    nearestOnOrAfter,
    periodChange,
    formatPrice,
    formatPercent,
  };
})();
