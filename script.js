Chart.defaults.color = '#FFFFFF';
Chart.defaults.scale.grid.color = ctx => ctx.scale.axis === 'y' ? '#FFFFFF18' : 'transparent';
Chart.defaults.plugins.legend.title.display = true;
Chart.defaults.plugins.legend.title.text = 'click to toggle';
Chart.defaults.plugins.legend.title.color = '#FFFFFF55';
Chart.defaults.plugins.legend.title.font = { size: 11, style: 'italic' };
Chart.defaults.interaction.mode = 'index';
Chart.defaults.interaction.intersect = false;
Chart.defaults.plugins.tooltip.callbacks.labelColor = ctx => {
  let c = ctx.dataset.borderColor || '#FFFFFF';
  if (typeof c === 'string' && c.length === 9) c = c.slice(0, 7);
  return { backgroundColor: c, borderColor: c };
};

Chart.register({
  id: 'crosshair',
  afterDraw(chart) {
    const active = chart.getActiveElements();
    if (!active.length) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.strokeStyle = '#FFFFFF55';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
});

Chart.register({
  id: 'dashedGap',
  afterDraw(chart) {
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, i) => {
      if (chart.getDatasetMeta(i).hidden) return;
      const pts = dataset.data;
      let gapStart = null;
      for (let i = 0; i < pts.length; i++) {
        if (pts[i] === null) {
          if (gapStart === null) gapStart = i - 1;
        } else {
          if (gapStart !== null && gapStart >= 0) {
            ctx.save();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = dataset.borderColor || '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(xScale.getPixelForValue(gapStart), yScale.getPixelForValue(pts[gapStart]));
            ctx.lineTo(xScale.getPixelForValue(i), yScale.getPixelForValue(pts[i]));
            ctx.stroke();
            ctx.restore();
          }
          gapStart = null;
        }
      }
    });
  }
});

function buildLabels(startYear = 2020, endYear = 2026) {
  const labels = [];
  for (let y = startYear; y <= endYear; y++)
    for (let m = 1; m <= 12; m++)
      labels.push(`${m}/${y}`);
  return labels;
}

function trimEnd(labels, ...dataArrays) {
  let last = -1;
  for (const arr of dataArrays)
    for (let i = arr.length - 1; i >= 0; i--)
      if (arr[i] !== null) { last = Math.max(last, i); break; }
  const end = last + 1;
  labels.splice(end);
  for (const arr of dataArrays) arr.splice(end);
}

function trimStart(labels, ...dataArrays) {
  let first = labels.length;
  for (const arr of dataArrays)
    for (let i = 0; i < arr.length; i++)
      if (arr[i] !== null) { first = Math.min(first, i); break; }
  labels.splice(0, first);
  for (const arr of dataArrays) arr.splice(0, first);
}

const lineColorSets = {
  normal:     { Red: '#DA291C', Orange: '#ED8B00', Blue: '#003DA5', Green: '#00843D' },
  colorblind: { Red: '#D55E00', Orange: '#E69F00', Blue: '#0072B2', Green: '#009E73' }
};
const ratingColorSets = {
  normal:     ['#DA291C', '#D4900C', '#1B75BC', '#1A8040'],
  colorblind: ['#CC79A7', '#F0E442', '#56B4E9', '#009E73']
};
const predictionColorSets = {
  normal:     ['#909090', '#DA291C'],
  colorblind: ['#909090', '#D55E00']
};
let colorblindMode = false;
const chartRefs = {};

function applyColorMode() {
  const lc = lineColorSets[colorblindMode ? 'colorblind' : 'normal'];
  const lines = ['Red', 'Orange', 'Blue', 'Green'];
  if (chartRefs.headways) {
    chartRefs.headways.data.datasets.forEach((ds, i) => {
      ds.borderColor = lc[lines[i]];
      ds.backgroundColor = lc[lines[i]] + '33';
    });
    chartRefs.headways.update();
  }
  if (chartRefs.alerts) {
    chartRefs.alerts.data.datasets.forEach((ds, i) => {
      ds.borderColor = lc[lines[i]];
      ds.backgroundColor = lc[lines[i]] + '33';
    });
    chartRefs.alerts.update();
  }
  if (chartRefs.predictions) {
    const pc = predictionColorSets[colorblindMode ? 'colorblind' : 'normal'];
    chartRefs.predictions.data.datasets.forEach((ds, i) => {
      ds.borderColor = pc[i];
      ds.backgroundColor = pc[i] + 'BB';
    });
    chartRefs.predictions.update();
  }
  if (chartRefs.ratings) {
    const rc = ratingColorSets[colorblindMode ? 'colorblind' : 'normal'];
    chartRefs.ratings.data.datasets.forEach((ds, i) => {
      if (chartRefs.ratings.data.datasets.length > 2) {
        const color = rc[Math.floor(i / 2)];
        ds.borderColor = color + 'BB';
        if (i % 2 === 0) ds.backgroundColor = color + '44';
      }
    });
    chartRefs.ratings.update();
  }
}

(function initNav() {
  const stations = document.querySelectorAll('.rl-station');
  const nav = document.querySelector('#rl-nav');
  const track = document.querySelector('#rl-track');
  const progress = document.querySelector('#rl-progress');

  function getTrackBounds() {
    const navRect = nav.getBoundingClientRect();
    const firstDot = stations[0].querySelector('.rl-dot');
    const lastDot  = stations[stations.length - 1].querySelector('.rl-dot');
    const firstRect = firstDot.getBoundingClientRect();
    const lastRect  = lastDot.getBoundingClientRect();
    const top    = firstRect.top  + firstRect.height  / 2 - navRect.top;
    const bottom = navRect.bottom - (lastRect.top + lastRect.height / 2);
    return { top, bottom };
  }

  function positionTrack() {
    const { top, bottom } = getTrackBounds();
    track.style.top    = top + 'px';
    track.style.bottom = bottom + 'px';
    progress.style.top = top + 'px';
  }

  function updateProgress(activeStation) {
    const { top } = getTrackBounds();
    const dot = activeStation.querySelector('.rl-dot');
    const navRect = nav.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    const dotCenterY = dotRect.top + dotRect.height / 2 - navRect.top;
    progress.style.top    = top + 'px';
    progress.style.height = Math.max(0, dotCenterY - top) + 'px';
  }

  stations.forEach(station => {
    station.addEventListener('click', () => {
      document.getElementById(station.dataset.target)
        .scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        stations.forEach(s => s.classList.remove('active'));
        const active = document.querySelector(`.rl-station[data-target="${entry.target.id}"]`);
        if (active) {
          active.classList.add('active');
          updateProgress(active);
        }
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

  stations.forEach(station => {
    const target = document.getElementById(station.dataset.target);
    if (target) observer.observe(target);
  });

  requestAnimationFrame(() => {
    positionTrack();
    const firstActive = document.querySelector('.rl-station.active');
    if (firstActive) updateProgress(firstActive);
  });
})();

document.getElementById('colorblind-toggle').addEventListener('click', () => {
  colorblindMode = !colorblindMode;
  document.getElementById('colorblind-toggle').textContent =
    colorblindMode ? 'Colorblind Mode: ON' : 'Colorblind Mode: OFF';
  applyColorMode();
});

(async function ridership() {
  const response = await fetch('jsonData/ridershipData.json');
  const data = await response.json();
  const labels = buildLabels();
  const values = labels.map((_, i) => {
    const y = 2020 + Math.floor(i / 12), m = (i % 12) + 1;
    return data[String(y)]?.[String(m)] ?? null;
  });

  trimEnd(labels, values);
  trimStart(labels, values);

  new Chart(
    document.getElementById('ridership'),
    {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
            label: 'Ridership',
            data: values,
            pointRadius: 0,
            fill: true,
            tension: 0.3,
            borderColor: '#DA291CBB',
            backgroundColor: '#DA291C22'
        }]
      },
      options: {
        plugins: {
          legend: {
            onClick: () => {},
            title: { display: false }
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              callback: (val, i) => labels[i]?.startsWith('1/') ? labels[i].split('/')[1] : ''
            }
          },
          y: {
            title: { display: true, text: 'Monthly Riders' },
            ticks: {
              callback: value => {
                if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M';
                if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
                return value;
              }
            }
          }
        }
      }
    }
  );
})();


(async function headways() {
  const response = await fetch('jsonData/headways.json');
  const data = await response.json();

  const lines = ['Red', 'Orange', 'Blue', 'Green'];
  const lineColors = lineColorSets.normal;

  const labels = buildLabels();
  const lineData = { Red: [], Orange: [], Blue: [], Green: [] };
  labels.forEach((_, i) => {
    const y = 2020 + Math.floor(i / 12), m = (i % 12) + 1;
    const month = data[String(y)]?.[String(m)] ?? null;
    for (const line of lines) {
      const val = month !== null ? month[line] ?? null : null;
      lineData[line].push(val !== null ? val / 60 : null);
    }
  });

  trimEnd(labels, ...Object.values(lineData));
  trimStart(labels, ...Object.values(lineData));

  const totalHeadwayData = labels.map((_, i) => {
    const vals = lines.map(l => lineData[l][i]).filter(v => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });

  const individualDatasets = lines.map(line => ({
    label: line + ' Line',
    data: lineData[line],
    borderColor: lineColors[line],
    backgroundColor: lineColors[line] + '33',
    pointRadius: 0,
    tension: 0.2
  }));

  const totalHeadwayDataset = [{
    label: 'All Lines (Average)',
    data: totalHeadwayData,
    borderColor: '#efefef',
    backgroundColor: '#efefef22',
    pointRadius: 0,
    tension: 0.2
  }];

  const chart = chartRefs.headways = new Chart(
    document.getElementById('headways'),
    {
      type: 'line',
      data: { labels, datasets: individualDatasets },
      options: {
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              callback: (val, i) => labels[i]?.startsWith('1/') ? labels[i].split('/')[1] : ''
            }
          },
          y: { min: 0, title: { display: true, text: 'Minutes' } }
        }
      }
    }
  );

  const btn = document.getElementById('headways-baseline-btn');
  let baseline = 0;
  btn.addEventListener('click', () => {
    baseline = baseline === 0 ? 6 : 0;
    chart.options.scales.y.min = baseline;
    btn.textContent = baseline === 0 ? 'Mode: True Comparison' : 'Mode: Better Viewing';
    chart.update();
  });

  let headwaysView = 'lines';
  document.getElementById('headways-view-btn').addEventListener('click', () => {
    headwaysView = headwaysView === 'lines' ? 'total' : 'lines';
    chart.data.datasets = headwaysView === 'lines' ? individualDatasets : totalHeadwayDataset;
    document.getElementById('headways-view-btn').textContent =
      headwaysView === 'lines' ? 'View: By Line' : 'View: Combined';
    chart.update();
  });
})();

(async function alerts() {
  const response = await fetch('jsonData/alertsData.json');
  const data = await response.json();

  const lines = ['red', 'orange', 'blue', 'green'];
  const lineColors = Object.fromEntries(
    Object.entries(lineColorSets.normal).map(([k, v]) => [k.toLowerCase(), v])
  );

  const labels = buildLabels();
  const lineData = { red: [], orange: [], blue: [], green: [] };
  labels.forEach((_, i) => {
    const y = 2020 + Math.floor(i / 12), m = (i % 12) + 1;
    const month = data[String(y)]?.[String(m)] ?? null;
    for (const line of lines)
      lineData[line].push(month !== null ? month[line] ?? null : null);
  });

  trimEnd(labels, ...Object.values(lineData));
  trimStart(labels, ...Object.values(lineData));

  const totalAlertsData = labels.map((_, i) => {
    const vals = lines.map(l => lineData[l][i]);
    if (vals.every(v => v === null)) return null;
    return vals.reduce((a, b) => a + (b ?? 0), 0);
  });

  const individualAlertDatasets = lines.map(line => ({
    label: line.charAt(0).toUpperCase() + line.slice(1) + ' Line',
    data: lineData[line],
    borderColor: lineColors[line],
    backgroundColor: lineColors[line] + '33',
    pointRadius: 0,
    tension: 0.2
  }));

  const totalAlertDataset = [{
    label: 'All Lines (Total)',
    data: totalAlertsData,
    borderColor: '#efefef',
    backgroundColor: '#efefef22',
    pointRadius: 0,
    tension: 0.2
  }];

  chartRefs.alerts = new Chart(
    document.getElementById('alerts'),
    {
      type: 'line',
      data: {
        labels,
        datasets: individualAlertDatasets
      },
      options: {
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              callback: (val, i) => labels[i]?.startsWith('1/') ? labels[i].split('/')[1] : ''
            }
          },
          y: { title: { display: true, text: 'Alerts' } }
        }
      }
    }
  );

  let alertsView = 'lines';
  document.getElementById('alerts-view-btn').addEventListener('click', () => {
    alertsView = alertsView === 'lines' ? 'total' : 'lines';
    chartRefs.alerts.data.datasets = alertsView === 'lines' ? individualAlertDatasets : totalAlertDataset;
    document.getElementById('alerts-view-btn').textContent =
      alertsView === 'lines' ? 'View: By Line' : 'View: Combined';
    chartRefs.alerts.update();
  });

})();

(async function predictions() {
  const response = await fetch('jsonData/predictionsData.json');
  const data = await response.json();

  const labels = buildLabels();
  const totalValues    = labels.map((_, i) => { const y = 2020 + Math.floor(i/12), m = (i%12)+1; return data.totalPredictions[String(y)]?.[String(m)] ?? null; });
  const accurateValues = labels.map((_, i) => { const y = 2020 + Math.floor(i/12), m = (i%12)+1; return data.accuratePredictions[String(y)]?.[String(m)] ?? null; });

  trimEnd(labels, totalValues, accurateValues);
  trimStart(labels, totalValues, accurateValues);

  const inaccurateValues = totalValues.map((t, i) =>
    t !== null && accurateValues[i] !== null ? t - accurateValues[i] : null
  );

  const accuracyPct = totalValues.map((t, i) =>
    t && accurateValues[i] !== null ? Math.round(accurateValues[i] / t * 1000) / 10 : null
  );

  const barDatasets = [
    {
      label: 'Accurate Predictions',
      data: accurateValues,
      borderColor: '#909090',
      backgroundColor: '#909090BB',
      borderWidth: 1,
      borderRadius: { bottomLeft: 5, bottomRight: 5, topLeft: 0, topRight: 0 },
      borderSkipped: false,
      stack: 'p'
    },
    {
      label: 'Inaccurate Predictions',
      data: inaccurateValues,
      borderColor: '#DA291C',
      backgroundColor: '#DA291CAA',
      borderWidth: 1,
      borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
      borderSkipped: false,
      stack: 'p'
    }
  ];

  const lineDataset = [{
    type: 'line',
    label: 'Accuracy %',
    data: accuracyPct,
    borderColor: '#909090',
    backgroundColor: '#90909022',
    pointRadius: 0,
    tension: 0.3
  }];

  chartRefs.predictions = new Chart(
    document.getElementById('predictions'),
    {
      type: 'bar',
      data: { labels, datasets: barDatasets },
      options: {
        plugins: {
          tooltip: {
            itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
            callbacks: {
              footer: items => {
                const acc   = items.find(i => i.dataset.label === 'Accurate Predictions')?.parsed.y;
                const inacc = items.find(i => i.dataset.label === 'Inaccurate Predictions')?.parsed.y;
                if (acc != null && inacc != null)
                  return `Accuracy: ${(acc / (acc + inacc) * 100).toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: {
              autoSkip: false,
              callback: (val, i) => labels[i]?.startsWith('1/') ? labels[i].split('/')[1] : ''
            }
          },
          y: { min: 0, stacked: true, title: { display: true, text: 'Predictions' } }
        }
      }
    }
  );

  let predictionsView = 'bars';
  document.getElementById('predictions-view-btn').addEventListener('click', () => {
    predictionsView = predictionsView === 'bars' ? 'line' : 'bars';
    const showLine = predictionsView === 'line';
    chartRefs.predictions.data.datasets = showLine ? lineDataset : barDatasets;
    chartRefs.predictions.options.scales.x.stacked = !showLine;
    chartRefs.predictions.options.scales.y.stacked = !showLine;
    chartRefs.predictions.options.scales.y.max    = showLine ? 100 : undefined;
    chartRefs.predictions.options.scales.y.title.text = showLine ? 'Accuracy %' : 'Predictions';
    document.getElementById('predictions-view-btn').textContent =
      showLine ? 'View: Accuracy %' : 'View: Volume';
    chartRefs.predictions.update();
  });
})();

(async function rating() {
  const response = await fetch('jsonData/ratingsData.json');
  const data = await response.json();

  const responseWeights = {
    'Extremely Dissatisfied':    1,
    'Very Dissatisfied':         2,
    'Somewhat Dissatisfied':     3,
    'Neutral':                   4,
    'Somewhat Satisfied':        5,
    'Very Satisfied':            6,
    'Extremely Satisfied':       7,
    'Strongly Disagree':         1,
    'Disagree':                  2,
    'Slightly Disagree':         3,
    'Neither Agree nor Disagree':4,
    'Slightly Agree':            5,
    'Agree':                     6,
    'Strongly Agree':            7
  };

  const questions = {
    communications:  { label: 'Communications',    color: '#DA291C' },
    ratingOverall:   { label: 'Overall Rating',    color: '#D4900C' },
    recentTripRating:{ label: 'Recent Trip Rating', color: '#1B75BC' },
    reliable:        { label: 'Reliability',        color: '#1A8040' }
  };

  const labels = buildLabels();
  const questionData = Object.fromEntries(Object.keys(questions).map(q => [q, []]));
  labels.forEach((_, i) => {
    const y = 2020 + Math.floor(i / 12), m = (i % 12) + 1;
    for (const q of Object.keys(questions)) {
      const d = data[q][String(y)]?.[String(m)] ?? null;
      questionData[q].push(d === null ? null :
        Object.entries(d).reduce((sum, [key, pct]) => sum + responseWeights[key] * pct, 0));
    }
  });

  trimEnd(labels, ...Object.values(questionData));
  trimStart(labels, ...Object.values(questionData));

  const centers = [3.5, 10.5, 17.5, 24.5];
  const questionKeys = Object.keys(questions);

  // ── by-line datasets & annotations ──────────────────────────────
  const byLineDatasets = questionKeys.flatMap((q, i) => {
    const center = centers[i];
    const { label, color } = questions[q];
    const top = questionData[q].map(s => s === null ? null : center + s / 2);
    const bot = questionData[q].map(s => s === null ? null : center - s / 2);
    return [
      { label, data: top, borderColor: color + 'BB', backgroundColor: color + '44', fill: '+1', pointRadius: 0, tension: 0.2 },
      { label: '', data: bot, borderColor: color + 'BB', fill: false, pointRadius: 0, tension: 0.2 }
    ];
  });

  const byLineAnnotations = {
    ...Object.fromEntries(
      [0, 7, 14, 21, 28].map((y, i) => [`sat${i}`, {
        type: 'line', yMin: y, yMax: y, borderColor: '#FFFFFF55', borderWidth: 1
      }])
    ),
    ...Object.fromEntries(
      [3.5, 10.5, 17.5, 24.5].flatMap((c, i) => [
        [`uns${i}a`, { type: 'line', yMin: c - 0.5, yMax: c - 0.5, borderColor: '#FFFFFF33', borderWidth: 1, borderDash: [4, 4] }],
        [`uns${i}b`, { type: 'line', yMin: c + 0.5, yMax: c + 0.5, borderColor: '#FFFFFF33', borderWidth: 1, borderDash: [4, 4] }]
      ])
    )
  };

  // ── total datasets & annotations ─────────────────────────────────
  // Band maps score → half-width: at score=7 fills full chart (±14),
  // at score=1 gives width=4 (4× the per-line unsatisfied band of 1).
  // half-width = 2 × score, center = 14.
  const totalCenter = 14;
  const totalColor = '#909090';
  const totalScores = labels.map((_, i) => {
    const vals = questionKeys.map(q => questionData[q][i]).filter(s => s !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });

  const totalDatasets = [
    {
      label: 'Customer Satisfaction',
      data: totalScores.map(s => s === null ? null : totalCenter + 2 * s),
      borderColor: totalColor + 'BB',
      backgroundColor: totalColor + '44',
      fill: '+1',
      pointRadius: 0,
      tension: 0.2
    },
    {
      label: '',
      data: totalScores.map(s => s === null ? null : totalCenter - 2 * s),
      borderColor: totalColor + 'BB',
      fill: false,
      pointRadius: 0,
      tension: 0.2
    }
  ];

  const totalAnnotations = {
    satTop: { type: 'line', yMin: 28, yMax: 28, borderColor: '#FFFFFF55', borderWidth: 1 },
    satBot: { type: 'line', yMin: 0,  yMax: 0,  borderColor: '#FFFFFF55', borderWidth: 1 },
    unsA:   { type: 'line', yMin: 12, yMax: 12, borderColor: '#FFFFFF33', borderWidth: 1, borderDash: [4, 4] },
    unsB:   { type: 'line', yMin: 16, yMax: 16, borderColor: '#FFFFFF33', borderWidth: 1, borderDash: [4, 4] }
  };

  let ratingsViewMode = 'byLine';

  chartRefs.ratings = new Chart(
    document.getElementById('ratings'),
    {
      type: 'line',
      data: { labels, datasets: byLineDatasets },
      options: {
        plugins: {
          legend: {
            onClick: () => {},
            reverse: true,
            title: { display: false },
            labels: { filter: item => item.text !== '' }
          },
          tooltip: {
            filter: item => item.dataset.label !== '',
            itemSort: (a, b) => b.parsed.y - a.parsed.y,
            callbacks: {
              label: context => {
                let raw;
                if (ratingsViewMode === 'byLine') {
                  const qi = Math.floor(context.datasetIndex / 2);
                  raw = (context.parsed.y - centers[qi]) * 2;
                } else {
                  raw = (context.parsed.y - totalCenter) / 2;
                }
                const score = ((raw - 1) / 6 * 100).toFixed(1);
                return `${context.dataset.label}: ${score}%`;
              }
            }
          },
          annotation: { annotations: byLineAnnotations }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              callback: (val, i) => labels[i]?.startsWith('1/') ? labels[i].split('/')[1] : ''
            }
          },
          y: {
            min: 0,
            max: 28,
            afterBuildTicks(axis) {
              axis.ticks = [0, 3.5, 7, 10.5, 14, 17.5, 21, 24.5, 28].map(v => ({ value: v }));
            },
            ticks: {
              callback: value => {
                if ([0, 7, 14, 21, 28].includes(value)) return 'Very Satisfied';
                if ([3.5, 10.5, 17.5, 24.5].includes(value)) return 'Very Unsatisfied';
              }
            }
          }
        }
      }
    }
  );

  document.getElementById('ratings-view-btn').addEventListener('click', () => {
    ratingsViewMode = ratingsViewMode === 'byLine' ? 'total' : 'byLine';
    const btn = document.getElementById('ratings-view-btn');
    const chart = chartRefs.ratings;

    if (ratingsViewMode === 'total') {
      btn.textContent = 'View: Total';
      chart.data.datasets = totalDatasets;
      chart.options.plugins.annotation.annotations = totalAnnotations;
      chart.options.plugins.legend.reverse = false;
      chart.options.scales.y.afterBuildTicks = axis => {
        axis.ticks = [0, 12, 16, 28].map(v => ({ value: v }));
      };
      chart.options.scales.y.ticks.callback = value => {
        if ([0, 28].includes(value)) return 'Very Satisfied';
        if ([12, 16].includes(value)) return 'Very Unsatisfied';
      };
    } else {
      btn.textContent = 'View: By Line';
      chart.data.datasets = byLineDatasets;
      chart.options.plugins.annotation.annotations = byLineAnnotations;
      chart.options.plugins.legend.reverse = true;
      chart.options.scales.y.afterBuildTicks = axis => {
        axis.ticks = [0, 3.5, 7, 10.5, 14, 17.5, 21, 24.5, 28].map(v => ({ value: v }));
      };
      chart.options.scales.y.ticks.callback = value => {
        if ([0, 7, 14, 21, 28].includes(value)) return 'Very Satisfied';
        if ([3.5, 10.5, 17.5, 24.5].includes(value)) return 'Very Unsatisfied';
      };
    }
    chart.update();
  });
})();

document.getElementById('predictions-note-btn').addEventListener('click', () => {
  const extra = document.getElementById('predictions-note-extra');
  const btn   = document.getElementById('predictions-note-btn');
  extra.hidden = !extra.hidden;
  btn.textContent = extra.hidden ? 'Read more' : 'Show less';
});

