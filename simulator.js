(() => {
  const runBtn = document.getElementById("runSimBtn");
  const resultEl = document.getElementById("simResult");
  const statsEl = document.getElementById("simStats");
  const canvas = document.getElementById("simChart");

  if (!runBtn || !canvas || typeof Chart === "undefined") return;

  let chartInstance = null;
  const MAX_RUNS = 500;

  function randNormal() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function percentile(sortedArr, p) {
    const idx = Math.min(sortedArr.length - 1, Math.floor(p * sortedArr.length));
    return sortedArr[idx];
  }

  function formatWon(n) {
    return Math.round(n).toLocaleString("ko-KR") + "만원";
  }

  function runSimulation({ initial, monthly, annualReturn, annualVol, years, runs }) {
    const months = years * 12;
    const monthlyReturn = annualReturn / 100 / 12;
    const monthlyVol = annualVol / 100 / Math.sqrt(12);

    const paths = [];
    for (let r = 0; r < runs; r++) {
      let balance = initial;
      const path = [balance];
      for (let m = 1; m <= months; m++) {
        const shock = randNormal() * monthlyVol;
        balance = balance * (1 + monthlyReturn + shock) + monthly;
        balance = Math.max(balance, 0);
        path.push(balance);
      }
      paths.push(path);
    }
    return paths;
  }

  function buildYearlySeries(paths, years) {
    const median = [];
    const p10 = [];
    const p90 = [];
    for (let y = 0; y <= years; y++) {
      const monthIdx = y * 12;
      const balances = paths.map((p) => p[monthIdx]).sort((a, b) => a - b);
      median.push(percentile(balances, 0.5));
      p10.push(percentile(balances, 0.1));
      p90.push(percentile(balances, 0.9));
    }
    return { median, p10, p90 };
  }

  function render() {
    const initial = Number(document.getElementById("simInitial").value) || 0;
    const monthly = Number(document.getElementById("simMonthly").value) || 0;
    const annualReturn = Number(document.getElementById("simReturn").value) || 0;
    const annualVol = Math.max(0, Number(document.getElementById("simVolatility").value) || 0);
    const years = Math.max(1, Math.min(40, Number(document.getElementById("simYears").value) || 10));
    const runsInput = Math.max(10, Number(document.getElementById("simRuns").value) || 200);
    const runs = Math.min(MAX_RUNS, runsInput);

    const paths = runSimulation({ initial, monthly, annualReturn, annualVol, years, runs });
    const { median, p10, p90 } = buildYearlySeries(paths, years);

    const finalBalances = paths.map((p) => p[p.length - 1]).sort((a, b) => a - b);
    const finalMedian = percentile(finalBalances, 0.5);
    const finalP10 = percentile(finalBalances, 0.1);
    const finalP90 = percentile(finalBalances, 0.9);
    const finalMin = finalBalances[0];
    const finalMax = finalBalances[finalBalances.length - 1];

    statsEl.innerHTML = `
      <div class="stat-box"><span class="stat-num">${formatWon(finalMedian)}</span><span class="stat-label">중간값 (${years}년 후)</span></div>
      <div class="stat-box"><span class="stat-num">${formatWon(finalP90)}</span><span class="stat-label">상위 10% 시나리오</span></div>
      <div class="stat-box"><span class="stat-num">${formatWon(finalP10)}</span><span class="stat-label">하위 10% 시나리오</span></div>
      <div class="stat-box"><span class="stat-num">${formatWon(finalMax - finalMin)}</span><span class="stat-label">최고-최저 격차</span></div>
    `;

    const labels = median.map((_, y) => y + "년");

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "하위 10%",
            data: p10,
            borderColor: "transparent",
            backgroundColor: "rgba(22, 100, 63, 0.08)",
            fill: false,
            pointRadius: 0,
            tension: 0.25,
          },
          {
            label: "상위 10%",
            data: p90,
            borderColor: "transparent",
            backgroundColor: "rgba(22, 100, 63, 0.15)",
            fill: "-1",
            pointRadius: 0,
            tension: 0.25,
          },
          {
            label: "중간값 (예상 경로)",
            data: median,
            borderColor: "#16643f",
            backgroundColor: "transparent",
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatWon(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          y: {
            ticks: { callback: (v) => Number(v).toLocaleString("ko-KR") + "만" },
          },
        },
      },
    });

    resultEl.hidden = false;
  }

  runBtn.addEventListener("click", render);
})();
