(() => {
  const POSITIVE_KEYWORDS = [
    "사상 최고", "역대급", "신고가", "급등", "상승", "강세", "호조", "개선",
    "훈풍", "반등", "매수", "순매수", "낙관", "성장", "호실적", "흑자전환",
    "상향", "기대감", "회복", "돌파", "금리 인하", "실적 서프라이즈",
    "수출 호조", "저가매수", "훈풍", "청신호", "역대 최대",
  ];

  const NEGATIVE_KEYWORDS = [
    "하락", "급락", "폭락", "약세", "부진", "악화", "최저치", "위기",
    "침체", "매도", "순매도", "비관", "둔화", "적자", "하향", "우려",
    "경고", "리스크", "금리 인상", "인플레이션 우려", "실업", "파산",
    "디폴트", "불확실성", "조정", "패닉", "붕괴", "쇼크", "먹구름",
  ];

  const keywordEl = document.getElementById("newsKeyword");
  const fetchBtn = document.getElementById("fetchNewsBtn");
  const analyzeBtn = document.getElementById("analyzeNewsBtn");
  const headlinesEl = document.getElementById("newsHeadlines");
  const statusEl = document.getElementById("newsStatus");
  const resultEl = document.getElementById("newsResult");
  const badgeEl = document.getElementById("sentimentBadge");
  const markerEl = document.getElementById("gaugeMarker");
  const statTotal = document.getElementById("statTotal");
  const statPos = document.getElementById("statPos");
  const statNeg = document.getElementById("statNeg");
  const listEl = document.getElementById("headlineList");

  if (!headlinesEl || !analyzeBtn) return;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function fetchNews() {
    const keyword = (keywordEl.value || "").trim();
    if (!keyword) {
      statusEl.textContent = "검색 키워드를 입력해주세요.";
      return;
    }
    fetchBtn.disabled = true;
    statusEl.textContent = "뉴스를 불러오는 중...";

    const url =
      "https://api.gdeltproject.org/api/v2/doc/doc?query=" +
      encodeURIComponent(keyword) +
      "&mode=artlist&format=json&maxrecords=15&sort=datedesc";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error("status " + res.status);
      const data = await res.json();
      const articles = data.articles || [];

      if (!articles.length) {
        statusEl.textContent =
          "관련 뉴스를 찾지 못했습니다. 다른 키워드를 시도하거나 직접 입력해주세요.";
        return;
      }

      const titles = [...new Set(articles.map((a) => a.title).filter(Boolean))];
      headlinesEl.value = titles.join("\n");
      statusEl.textContent = titles.length + "개의 헤드라인을 가져왔습니다. 필요하면 편집 후 분석하세요.";
    } catch (err) {
      statusEl.textContent =
        "뉴스를 불러오지 못했습니다 (요청 제한 또는 네트워크 오류). 헤드라인을 직접 입력해주세요.";
    } finally {
      fetchBtn.disabled = false;
    }
  }

  function analyze() {
    const lines = headlinesEl.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!lines.length) {
      statusEl.textContent = "분석할 헤드라인을 먼저 입력하거나 가져와주세요.";
      resultEl.hidden = true;
      return;
    }

    let totalPos = 0;
    let totalNeg = 0;
    const rows = lines.map((line) => {
      const matchedPos = POSITIVE_KEYWORDS.filter((k) => line.includes(k));
      const matchedNeg = NEGATIVE_KEYWORDS.filter((k) => line.includes(k));
      totalPos += matchedPos.length;
      totalNeg += matchedNeg.length;
      let sentiment = "neutral";
      if (matchedPos.length > matchedNeg.length) sentiment = "positive";
      else if (matchedNeg.length > matchedPos.length) sentiment = "negative";
      return { line, matchedPos, matchedNeg, sentiment };
    });

    const totalKeywords = totalPos + totalNeg;
    const rawScore = totalKeywords === 0 ? 0 : ((totalPos - totalNeg) / totalKeywords) * 100;
    const score = Math.max(-100, Math.min(100, Math.round(rawScore)));

    let label = "중립·혼조";
    let badgeClass = "";
    if (totalKeywords === 0) {
      label = "중립 (키워드 미검출)";
    } else if (score >= 20) {
      label = "강세 우세";
      badgeClass = "positive";
    } else if (score <= -20) {
      label = "약세 우세";
      badgeClass = "negative";
    }

    badgeEl.textContent = label;
    badgeEl.className = "sentiment-badge" + (badgeClass ? " " + badgeClass : "");
    markerEl.style.left = (score + 100) / 2 + "%";

    statTotal.textContent = String(lines.length);
    statPos.textContent = String(totalPos);
    statNeg.textContent = String(totalNeg);

    listEl.innerHTML = rows
      .map((row) => {
        const tagText =
          row.sentiment === "positive" ? "긍정" : row.sentiment === "negative" ? "부정" : "중립";
        const keywordsFound = [...row.matchedPos, ...row.matchedNeg];
        const keywordsHtml = keywordsFound.length
          ? `<span class="headline-keywords">감지된 키워드: ${keywordsFound.map(escapeHtml).join(", ")}</span>`
          : "";
        return `<li class="headline-item ${row.sentiment}">
          <span class="headline-tag">${tagText}</span>
          <span class="headline-text">${escapeHtml(row.line)}${keywordsHtml}</span>
        </li>`;
      })
      .join("");

    resultEl.hidden = false;
    statusEl.textContent = "";
  }

  fetchBtn?.addEventListener("click", fetchNews);
  analyzeBtn.addEventListener("click", analyze);
})();
