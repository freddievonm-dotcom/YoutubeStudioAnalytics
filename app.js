// ===== YouTube Studio Replica - app.js =====

// Storage version guard: bump this to wipe stale localStorage on next load
(function () {
  const STORAGE_VERSION = '3';
  if (localStorage.getItem('yt_replica_version') !== STORAGE_VERSION) {
    // Clear all yt_replica_* keys
    Object.keys(localStorage)
      .filter(k => k.startsWith('yt_replica_'))
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem('yt_replica_version', STORAGE_VERSION);
  }
})();

// ===== CHART UTILITIES & PLUGINS =====
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw: (chart) => {
    const { ctx, tooltip, chartArea } = chart;
    if (tooltip && tooltip.opacity > 0) {
      const x = tooltip.caretX;
      const y = tooltip.caretY;

      // Draw vertical line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();

      // Draw point indicator
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3ea6ff';
      ctx.shadowBlur = 0; // No glow for the dot itself to keep it sharp
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Ensure tooltip hides when no active point (e.g. mouse out)
      const tooltipEl = document.getElementById('chart-tooltip');
      if (tooltipEl) tooltipEl.style.opacity = '0';
    }
  }
};

const neonGlowPlugin = {
  id: 'neonGlowPlugin',
  beforeDatasetDraw: (chart, args, options) => {
    const { ctx } = chart;
    const meta = args.meta;
    const dataset = chart.data.datasets[args.index];
    if (meta.type !== 'line') return;

    const points = meta.data;
    if (!points || points.length < 2) return;

    ctx.save();

    const drawGlowLayer = (blur, width, opacity) => {
      ctx.beginPath();
      ctx.lineWidth = width;
      ctx.shadowBlur = blur;
      ctx.shadowColor = dataset.borderColor;
      ctx.strokeStyle = dataset.borderColor;
      ctx.globalAlpha = opacity;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    };

    // Layer 1: Wide very soft ambient glow
    drawGlowLayer(35, 2, 0.15);
    // Layer 2: Concentrated core glow
    drawGlowLayer(12, 2, 0.4);

    ctx.restore();
  }
};

const areaGradientPlugin = {
  id: 'areaGradient',
  beforeDatasetsUpdate: (chart) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    chart.data.datasets.forEach(dataset => {
      // Only apply to line charts that use fill
      if (dataset.borderColor && dataset.fill) {
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        const baseColor = dataset.borderColor;

        const colorWithAlpha = (alpha) => {
          if (baseColor === '#5abaff' || baseColor === '#3ea6ff') return `rgba(90, 186, 255, ${alpha})`;
          if (baseColor === '#2ba640') return `rgba(43, 166, 64, ${alpha})`;
          return baseColor;
        };

        gradient.addColorStop(0, colorWithAlpha(0.12));
        gradient.addColorStop(1, colorWithAlpha(0));
        dataset.backgroundColor = gradient;
      }
    });
  }
};

const externalTooltipHandler = (context) => {
  const { chart, tooltip } = context;
  const tooltipEl = document.getElementById('chart-tooltip');

  // Debug log to confirm handler is being called
  console.log('Tooltip Handler Triggered - Opacity:', tooltip.opacity);

  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map(b => b.lines);

    let innerHtml = '<div class="tooltip-date">' + (titleLines[0] || '') + '</div>';
    bodyLines.forEach((body, i) => {
      const valStr = body[0];
      const val = parseFloat(valStr.replace(/[^\d.]/g, ''));

      // Check if revenue is the active metric
      const activeCard = document.querySelector('.stat-card.active-card');
      const isRevenue = activeCard && activeCard.querySelector('.stat-label').textContent === 'Estimated revenue';

      // Revenue gets decimals and $
      const formattedVal = isRevenue
        ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : val.toLocaleString('en-US');

      const colorStyle = 'style="color: #5abaff;"';
      const prefix = isRevenue ? '$' : '';

      innerHtml += `<div class="tooltip-value" ${colorStyle}>${prefix}${formattedVal}</div>`;
    });

    tooltipEl.innerHTML = innerHtml;
  }

  const rect = chart.canvas.getBoundingClientRect();

  tooltipEl.style.opacity = 1;
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.left = rect.left + tooltip.caretX + 'px';
  tooltipEl.style.top = rect.top + tooltip.caretY - 100 + 'px'; // Move up slightly more
  tooltipEl.style.transform = 'translateX(-50%)';
};

// --- DATA ---
const topContentData = [
  { num: 1, title: "How to Hide Likes on Instagram in 2025", date: "Jan 15, 2025", duration: "3:12", durationPct: "(58.2%)", views: "1,010" },
  { num: 2, title: "How To Create TikTok Collabs", date: "Jan 8, 2025", duration: "4:05", durationPct: "(51.3%)", views: "118" },
  { num: 3, title: "Getting started with ContentStudio", date: "Dec 28, 2024", duration: "5:44", durationPct: "(48.1%)", views: "39" },
  { num: 4, title: "YouTube Analytics Explained 2025", date: "Dec 24, 2024", duration: "6:20", durationPct: "(42.8%)", views: "28" },
];

const contentVideos = [
  { title: "How to Hide Likes on Instagram in 2025", visibility: "Public", date: "Jan 15, 2025", views: "1,010", comments: "48", likes: "92", revenue: "—" },
  { title: "How To Create TikTok Collabs", visibility: "Public", date: "Jan 8, 2025", views: "118", comments: "12", likes: "31", revenue: "—" },
  { title: "Getting started with ContentStudio", visibility: "Public", date: "Dec 28, 2024", views: "39", comments: "5", likes: "11", revenue: "—" },
  { title: "YouTube Analytics Explained 2025", visibility: "Public", date: "Dec 24, 2024", views: "28", comments: "3", likes: "7", revenue: "—" },
];

const commentsData = [
  { author: "TechEnthusiast", text: "This was super helpful, thank you! 🙌", date: "2 days ago", initials: "TE", color: "#2980b9" },
  { author: "CreatorMike", text: "Could you make a video on YouTube Shorts strategy?", date: "3 days ago", initials: "CM", color: "#8e44ad" },
  { author: "SarahJ", text: "I've been looking for a tutorial like this for months!", date: "5 days ago", initials: "SJ", color: "#27ae60" },
  { author: "Curious Creator", text: "Does this work for business accounts too?", date: "1 week ago", initials: "CC", color: "#e67e22" },
  { author: "AlexFromYT", text: "The analytics breakdown was exactly what I needed.", date: "1 week ago", initials: "AY", color: "#c0392b" },
];

// ===== SIDEBAR NAVIGATION =====
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const tab = item.dataset.tab;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`tab-${tab}`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ===== ANALYTICS SUB TABS =====
function initSubTabs() {
  document.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`subtab-${tab.dataset.subtab}`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ===== FILTER BUTTONS =====
function initFilterBtns() {
  document.querySelectorAll('.content-filters, .comment-filters, .custom-tabs').forEach(group => {
    group.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active-filter'));
        btn.classList.add('active-filter');
      });
    });
  });
}

// ===== TOP CONTENT TABLE =====
function populateTopContent() {
  const tbody = document.getElementById('topContentBody');
  if (!tbody) return;
  tbody.innerHTML = topContentData.map(row => `
    <tr>
      <td class="row-num">${row.num}</td>
      <td>
        <div class="thumb-placeholder-row top-content-thumb" data-persist-id="top_video_${row.num}_thumb" style="cursor:pointer">
          <span class="material-icons thumb-play-icon" style="color:#555;font-size:16px">play_circle_filled</span>
        </div>
      </td>
      <td class="col-title-cell">
        <div class="video-info">
          <span class="video-title-cell editable-stat" contenteditable="true" spellcheck="false" data-persist-id="top_video_${row.num}_title">${row.title}</span>
          <span class="video-date editable-stat" contenteditable="true" spellcheck="false" data-persist-id="top_video_${row.num}_date">${row.date}</span>
        </div>
      </td>
      <td class="duration-cell">
        <span contenteditable="true" spellcheck="false" class="editable-stat" data-persist-id="top_video_${row.num}_duration">${row.duration}</span>
        <span style="color:var(--text-muted);font-size:11px"> ${row.durationPct}</span>
      </td>
      <td class="views-cell editable-stat" contenteditable="true" spellcheck="false" data-persist-id="top_video_${row.num}_views">${row.views}</td>
    </tr>
  `).join('');
}

// ===== CONTENT TABLE =====
function populateContentTable() {
  const tbody = document.getElementById('contentTableBody');
  if (!tbody) return;
  tbody.innerHTML = contentVideos.map((v, i) => `
    <tr class="content-video-row" data-video-index="${i}" style="cursor:pointer">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="thumb-placeholder-row" style="flex-shrink:0">
            <span class="material-icons" style="color:#555;font-size:16px">play_circle_filled</span>
          </div>
          <span contenteditable="true" spellcheck="false" class="editable-stat" data-persist-id="content_video_${i}_title">${v.title}</span>
        </div>
      </td>
      <td>
        <select class="inline-select">
          <option ${v.visibility === 'Public' ? 'selected' : ''}>Public</option>
          <option ${v.visibility === 'Unlisted' ? 'selected' : ''}>Unlisted</option>
          <option ${v.visibility === 'Private' ? 'selected' : ''}>Private</option>
        </select>
      </td>
      <td contenteditable="true" spellcheck="false" class="editable-stat" data-persist-id="content_video_${i}_date">${v.date}</td>
      <td contenteditable="true" spellcheck="false" class="editable-stat" data-persist-id="content_video_${i}_views">${v.views}</td>
      <td contenteditable="true" spellcheck="false" class="editable-stat" data-persist-id="content_video_${i}_comments">${v.comments}</td>
      <td contenteditable="true" spellcheck="false" class="editable-stat" data-persist-id="content_video_${i}_likes">${v.likes}</td>
      <td contenteditable="true" spellcheck="false" class="editable-stat" data-persist-id="content_video_${i}_revenue" style="color:#a8c7fa">${v.revenue}</td>
    </tr>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.content-video-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't trigger if clicking editable fields or select
      if (e.target.closest('[contenteditable="true"]') || e.target.closest('.inline-select')) return;
      const index = row.dataset.videoIndex;
      showVideoAnalytics(contentVideos[index]);
    });
  });
}

function showVideoAnalytics(video) {
  // Hide all panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show Video Analytics panel
  const panel = document.getElementById('tab-video-analytics');
  panel.classList.add('active');

  // Update Header
  document.getElementById('vaHeaderTitle').textContent = video.title;
  const thumb = document.getElementById('vaHeaderThumb');
  // Re-use RT thumb backgrounds or generic gradient
  thumb.style.background = 'linear-gradient(135deg, #2c3e50, #000)';

  // Populate Stats
  document.getElementById('vStatViews').textContent = video.views;
  document.getElementById('vRealtimeViews').textContent = video.views;
  // Simulated watch time / subs
  document.getElementById('vStatWatchTime').textContent = (parseFloat(video.views.replace(/,/g, '')) * 0.05).toFixed(1);
  document.getElementById('vStatSubs').textContent = '+' + Math.floor(parseFloat(video.views.replace(/,/g, '')) * 0.005);

  // Initialize Video Chart
  initVideoChart(video);

  window.scrollTo(0, 0);
  showToast('Viewing video analytics');
}

function initVideoChart(video) {
  const ctx = document.getElementById('videoAnalyticsChart');
  if (!ctx) return;

  // Cleanup old chart if exists
  if (activeCharts['videoAnalyticsChart']) {
    activeCharts['videoAnalyticsChart'].destroy();
  }

  const labels = generateLabels(28);
  const data = generateDataThatSumsTo(video.views, 28);

  activeCharts['videoAnalyticsChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        borderColor: '#5abaff',
        backgroundColor: 'rgba(90, 186, 255, 0.05)',
        borderWidth: 2, pointRadius: 0, fill: true, tension: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: externalTooltipHandler,
          displayColors: false
        }
      },
      scales: {
        x: { display: true, grid: { display: false }, ticks: { maxTicksLimit: 5, font: { size: 11 }, color: '#717171' } },
        y: { beginAtZero: true, display: true, position: 'right', grid: { display: true, color: 'rgba(255,255,255,0.05)', drawTicks: false }, ticks: { font: { size: 11 }, color: '#717171', maxTicksLimit: 4 } }
      }
    },
    plugins: [crosshairPlugin, neonGlowPlugin, areaGradientPlugin]
  });
}

// ===== COMMENTS =====
function populateComments() {
  const list = document.getElementById('commentsList');
  if (!list) return;
  list.innerHTML = commentsData.map((c, i) => `
    <div class="comment-item">
      <div class="comment-avatar" style="background:${c.color}">${c.initials}</div>
      <div class="comment-body">
        <div class="comment-author">${c.author}</div>
        <div class="comment-text editable-stat" contenteditable="true" spellcheck="false" data-persist-id="comment_${i}_text">${c.text}</div>
        <div class="comment-date">${c.date}</div>
      </div>
      <div class="comment-actions">
        <button class="comment-action-btn" title="Like"><span class="material-icons">thumb_up</span></button>
        <button class="comment-action-btn" title="More"><span class="material-icons">more_vert</span></button>
      </div>
    </div>
  `).join('');
}

// ===== CHARTS =====
function generateDataThatSumsTo(totalStr, count = 28) {
  // Clean the total string (e.g., "15.8K" -> 15800, "+35" -> 35, "$124.50" -> 124.5)
  let cleanTotal = totalStr.replace(/[^\d.]/g, '');
  let multiplier = 1;
  if (totalStr.includes('K')) multiplier = 1000;
  if (totalStr.includes('M')) multiplier = 1000000;
  let total = parseFloat(cleanTotal) * multiplier || 0;

  // Generate noisy distribution
  let data = Array.from({ length: count }, () => Math.random() + 0.5);
  let currentSum = data.reduce((a, b) => a + b, 0);

  // Scale to match total
  data = data.map(v => (v / currentSum) * total);

  // Apply "YouTube style" smoothing/noise
  return data.map(v => Math.max(0, Math.round(v + (Math.random() - 0.5) * (total / 100))));
}

function generateMainChartData() {
  const base = 500;
  return Array.from({ length: 28 }, (_, i) => {
    return Math.round(base + (Math.random() - 0.5) * 400);
  });
}

function generateMiniData() {
  return Array.from({ length: 48 }, () => Math.max(10, 600 + Math.random() * 1600));
}

function setupStatCardInteractions(chart) {
  const cards = document.querySelectorAll('.stat-card');
  const metricConfig = {
    'Views': { color: '#5abaff', bg: 'rgba(90, 186, 255, 0.05)' },
    'Watch time (hours)': { color: '#5abaff', bg: 'rgba(90, 186, 255, 0.05)' },
    'Subscribers': { color: '#5abaff', bg: 'rgba(90, 186, 255, 0.05)' },
    'Estimated revenue': { color: '#5abaff', bg: 'rgba(90, 186, 255, 0.05)' }
  };

  cards.forEach(card => {
    card.style.cursor = 'pointer';

    // Initial active state check
    if (card.classList.contains('active-card')) {
      // Do nothing, already setup
    }

    const metricLabel = card.querySelector('.stat-label').textContent;
    const valueEl = card.querySelector('.stat-value');

    // Click to switch chart
    card.addEventListener('click', () => {
      // Clear previous active states
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active-card'));
      card.classList.add('active-card');

      const config = metricConfig[metricLabel] || metricConfig['Views'];
      const newData = generateDataThatSumsTo(valueEl.textContent);

      chart.data.datasets[0].data = newData;
      chart.data.datasets[0].borderColor = config.color;
      chart.data.datasets[0].backgroundColor = config.bg;
      chart.update();
    });

    // Input to regenerate chart in real-time
    valueEl.addEventListener('input', () => {
      if (card.classList.contains('active-card')) {
        const config = metricConfig[metricLabel] || metricConfig['Views'];
        chart.data.datasets[0].data = generateDataThatSumsTo(valueEl.textContent);
        chart.update();
      }
    });
  });
}

const activeCharts = {};

function initCharts() {
  Chart.defaults.color = '#aaaaaa';
  Chart.defaults.font.family = "'Roboto', sans-serif";

  const labels28 = generateLabels(28);

  const initializeChart = (id, type) => {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    const savedData = localStorage.getItem(`yt_replica_chart_${id}`);
    let initialData = savedData ? JSON.parse(savedData) : generateMainChartData();

    // Sanitize: ensure no trailing nulls or accidental zeros from stale logic
    initialData = initialData.map(v => (v === null || isNaN(v)) ? Math.round(500 + Math.random() * 200) : v);
    if (initialData.length < 28) {
      while (initialData.length < 28) initialData.push(Math.round(500 + Math.random() * 200));
    }

    const chart = new Chart(ctx, {
      type: type,
      data: {
        labels: labels28,
        datasets: [{
          data: initialData,
          borderColor: '#5abaff',
          backgroundColor: 'rgba(90, 186, 255, 0.05)',
          borderWidth: 2, pointRadius: 0, fill: true, tension: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: externalTooltipHandler,
            displayColors: false
          }
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            ticks: { maxTicksLimit: 5, font: { size: 11 }, color: '#717171' }
          },
          y: {
            beginAtZero: true,
            display: true,
            position: 'right',
            grid: { display: true, color: 'rgba(255,255,255,0.05)', drawTicks: false },
            ticks: { font: { size: 11 }, color: '#717171', maxTicksLimit: 4 }
          }
        }
      },
      plugins: [crosshairPlugin, neonGlowPlugin, areaGradientPlugin]
    });

    activeCharts[id] = chart;

    if (id === 'analyticsChart') {
      setupStatCardInteractions(chart);
    }

    // Click to edit
    ctx.style.cursor = 'pointer';
    ctx.addEventListener('click', () => openChartEditor(id));
  };

  ['analyticsChart', 'contentChart', 'audienceChart'].forEach(id => initializeChart(id, 'line'));

  const revCtx = document.getElementById('revenueChart');
  if (revCtx) {
    const savedRev = localStorage.getItem('yt_replica_chart_revenueChart');
    const initialRev = savedRev ? JSON.parse(savedRev) : Array.from({ length: 28 }, () => Math.random() * 50);
    activeCharts['revenueChart'] = new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: labels28,
        datasets: [{
          data: initialRev,
          backgroundColor: '#5abaff',
          borderRadius: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: externalTooltipHandler,
            displayColors: false
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { maxTicksLimit: 5, font: { size: 11 }, color: '#717171' } },
          y: { beginAtZero: true, position: 'right', ticks: { font: { size: 11 }, color: '#717171' } }
        }
      },
      plugins: [crosshairPlugin, neonGlowPlugin, areaGradientPlugin]
    });
    revCtx.style.cursor = 'pointer';
    revCtx.addEventListener('click', () => openChartEditor('revenueChart'));
  }

  const miniCtx = document.getElementById('miniChart');
  if (miniCtx) {
    const miniData = generateMiniData();
    activeCharts['miniChart'] = new Chart(miniCtx, {
      type: 'bar',
      data: {
        labels: miniData.map((_, i) => i),
        datasets: [{ data: miniData, backgroundColor: '#5abaff', borderRadius: 1 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false
      }
    });
  }
}

function generateLabels(count) {
  const labels = [];
  const d = new Date(2025, 4, 1); // Start in May 2025 to align with reference
  for (let i = 0; i < count; i++) {
    // Format: "Mon, May 19, 2025"
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    labels.push(d.toLocaleDateString('en-US', options));
    d.setDate(d.getDate() + 1);
  }
  return labels;
}

function openChartEditor(chartId) {
  const chart = activeCharts[chartId];
  if (!chart) return;

  const overlay = document.getElementById('chartEditOverlay');
  const input = document.getElementById('chartDataInput');
  const saveBtn = document.getElementById('saveChartBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  input.value = chart.data.datasets[0].data.join('\n');
  overlay.style.display = 'flex';

  const closeHandler = () => overlay.style.display = 'none';

  saveBtn.onclick = () => {
    const vals = input.value.split('\n').map(v => parseFloat(v.trim()) || 0);
    chart.data.datasets[0].data = vals;
    chart.update();
    localStorage.setItem(`yt_replica_chart_${chartId}`, JSON.stringify(vals));
    closeHandler();
    showToast('Chart updated - High fidelity data saved');
  };

  cancelBtn.onclick = closeHandler;
  overlay.onclick = e => { if (e.target === overlay) closeHandler(); };
}

// ===== AVATAR UPLOAD =====
function updateAllAvatars(src) {
  const imgHtml = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  const topImgHtml = `<img src="${src}" style="width:32px;height:32px;object-fit:cover;border-radius:50%;" />`;

  const mainAvatar = document.getElementById('channelAvatar');
  if (mainAvatar) mainAvatar.innerHTML = imgHtml;

  const navAvatar = document.getElementById('navAvatar');
  if (navAvatar) navAvatar.src = src;

  const modalAvatar = document.getElementById('modalAvatarPreview');
  if (modalAvatar) modalAvatar.innerHTML = imgHtml;

  localStorage.setItem('yt_replica_avatar', src);
}

function initAvatarUpload() {
  const navInput = document.getElementById('navAvatarInput');
  const triggerBtns = document.querySelectorAll('#navAvatar, #channelAvatar, #profileAvatarBtn, #modalAvatarPreview');

  triggerBtns.forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => navInput?.click());
  });

  navInput?.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => updateAllAvatars(e.target.result);
    reader.readAsDataURL(file);
  });
}

// ===== CUSTOMIZATION & PERSISTENCE =====
function initPersistence() {
  const editableItems = document.querySelectorAll('[data-persist-id]');

  // Load
  editableItems.forEach(el => {
    const id = el.dataset.persistId;
    const saved = localStorage.getItem(`yt_replica_${id}`);
    if (saved) {
      if (el.tagName === 'IMG') {
        el.src = saved;
      } else if (el.classList.contains('rt-thumb-custom')) {
        el.style.background = `url(${saved}) center/cover no-repeat`;
        el.querySelector('.rt-thumb-play').style.display = 'none';
      } else if (el.classList.contains('top-content-thumb')) {
        el.style.background = `url(${saved}) center/cover no-repeat`;
        const playIcon = el.querySelector('.thumb-play-icon');
        if (playIcon) playIcon.style.display = 'none';
      } else if (el.id === 'channelAvatar') {
        el.innerHTML = `<img src="${saved}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      } else {
        el.textContent = saved;
      }
    }
  });

  // Save on edit
  document.addEventListener('input', e => {
    const el = e.target.closest('[data-persist-id]');
    if (el) {
      const id = el.dataset.persistId;
      localStorage.setItem(`yt_replica_${id}`, el.textContent);

      // Sync other instances of the same ID
      document.querySelectorAll(`[data-persist-id="${id}"]`).forEach(other => {
        if (other !== el) other.textContent = el.textContent;
      });
    }
  });

  const savedAvatar = localStorage.getItem('yt_replica_avatar');
  if (savedAvatar) updateAllAvatars(savedAvatar);
}

function initProfileModal() {
  const modal = document.getElementById('profileModal');
  const closeBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelModal');
  const saveBtn = document.getElementById('saveProfile');

  [closeBtn, cancelBtn].forEach(b => b?.addEventListener('click', () => modal.classList.remove('open')));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

  saveBtn?.addEventListener('click', () => {
    const nameInp = document.getElementById('modalChannelName');
    if (nameInp) {
      const name = nameInp.value;
      document.querySelectorAll('[data-persist-id="channelName"]').forEach(el => el.textContent = name);
      localStorage.setItem('yt_replica_channelName', name);
    }
    modal.classList.remove('open');
    showToast('Profile saved');
  });
}

// ===== DATE RANGE =====
function initDateRange() {
  const sel = document.getElementById('dateRangeSelect');
  const label = document.getElementById('dateRangeLabel');
  if (!sel || !label) return;

  const savedVal = localStorage.getItem('yt_replica_dateRange');
  if (savedVal) sel.value = savedVal;

  const map = {
    last28: 'Dec 24, 2024 – Jan 20, 2025',
    last7: 'Jan 14, 2025 – Jan 20, 2025',
    last90: 'Oct 22, 2024 – Jan 20, 2025',
    last365: 'Jan 21, 2024 – Jan 20, 2025',
    lifetime: 'All time',
  };
  const headlines = {
    last28: '15,832',
    last7: '4,102',
    last90: '42,814',
    last365: '158,300',
    lifetime: '210,441',
  };

  const update = () => {
    const range = sel.value;

    // Date Label Persistence
    const savedLabel = localStorage.getItem('yt_replica_dateRangeLabel');
    if (savedLabel) {
      label.textContent = savedLabel;
    } else {
      label.textContent = map[range] || '';
    }

    const hv = document.getElementById('headlineViews');
    if (hv) {
      // Check for range-specific saved value first
      const saved = localStorage.getItem(`yt_replica_headlineViews_${range}`);
      if (saved) {
        hv.textContent = saved;
      } else {
        hv.textContent = headlines[range] || '';
      }
    }
    localStorage.setItem('yt_replica_dateRange', range);
  };

  sel.addEventListener('change', update);

  // Specific persistence for headline views to handle different date ranges
  const hv = document.getElementById('headlineViews');
  hv?.addEventListener('input', () => {
    localStorage.setItem(`yt_replica_headlineViews_${sel.value}`, hv.textContent);
  });

  // Date range label manual override persistence
  label.addEventListener('input', () => {
    localStorage.setItem('yt_replica_dateRangeLabel', label.textContent);
  });

  update();
}

// ===== TOAST =====
function showToast(msg) {
  let t = document.getElementById('yt-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'yt-toast';
    t.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:#383838;color:#f1f1f1;padding:10px 22px;border-radius:4px;
      font-size:13px;z-index:9999;opacity:0;transition:opacity 0.25s;
      box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:none;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

function initSaveBtns() {
  document.querySelectorAll('.save-btn-pill, .save-btn').forEach(btn => {
    if (btn.id === 'saveProfile') return;
    btn.addEventListener('click', () => showToast('Changes saved'));
  });
}

function initCreateBtn() {
  document.getElementById('createBtn')?.addEventListener('click', () => showToast('Upload video — coming soon'));
}

function initPagination() {
  const info = document.getElementById('latestPageInfo');
  let page = 1, total = 10;
  document.querySelectorAll('.page-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      page = idx === 0 ? Math.max(1, page - 1) : Math.min(total, page + 1);
      if (info) info.textContent = `${page} of ${total}`;
    });
  });
}

// ===== LIVE REALTIME COUNTER ENGINE =====
function parseCount(str) {
  return parseInt(str.replace(/,/g, ''), 10) || 0;
}
function formatCount(num) {
  return num.toLocaleString('en-US');
}

function initLiveCounter() {
  const elSubs = document.getElementById('realtimeSubs');
  const elViews = document.getElementById('realtimeViews');
  const rtv = [
    document.getElementById('rtv0'),
    document.getElementById('rtv1'),
    document.getElementById('rtv2')
  ];

  function incrementEl(el, amount) {
    if (!el) return;
    if (document.activeElement === el) return;
    let current = parseCount(el.textContent);
    current += amount;
    el.textContent = formatCount(current);

    const id = el.dataset.persistId;
    if (id) localStorage.setItem(`yt_replica_${id}`, el.textContent);

    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 300);
  }

  setInterval(() => {
    if (Math.random() < 0.4) {
      incrementEl(elSubs, Math.random() < 0.8 ? 1 : -1);
    }
  }, 4000);

  // Total Views - Update frequently (every ~1s with randomness)
  setInterval(() => {
    if (Math.random() < 0.7) {
      const viewsAdded = Math.floor(Math.random() * 5) + 1;
      incrementEl(elViews, viewsAdded);

      // Also update video analytics if active
      const vVaViews = document.getElementById('vStatViews');
      const vRtViews = document.getElementById('vRealtimeViews');
      if (document.getElementById('tab-video-analytics').classList.contains('active')) {
        incrementEl(vVaViews, viewsAdded);
        incrementEl(vRtViews, viewsAdded);
      }

      let remaining = viewsAdded;
      while (remaining > 0) {
        const r = Math.random();
        const idx = r < 0.6 ? 0 : r < 0.9 ? 1 : 2;
        incrementEl(rtv[idx], 1);
        remaining--;
      }
    }
  }, 1000);

  // Realtime Activity Chart (48h) - Update once per hour
  setInterval(() => {
    const miniChart = activeCharts['miniChart'];
    if (miniChart) {
      const dataConfig = miniChart.data.datasets[0];
      const dataArr = dataConfig.data;
      dataArr.shift();
      dataArr.push(Math.max(10, 600 + Math.random() * 1600));
      miniChart.update('none');
    }
  }, 3600000); // 3,600,000 ms = 1 hour
}

function initVideoAnalyticsBack() {
  document.getElementById('backToChannelContent')?.addEventListener('click', () => {
    // Return to content tab
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-content').classList.add('active');
    document.querySelector('.nav-item[data-tab="content"]').classList.add('active');
  });
}

function initVideoAnalyticsSubTabs() {
  document.querySelectorAll('.va-sub-tabs .sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.va-sub-tabs .sub-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // For now, we only show Overview, but we can add more sub-panels if needed
      showToast(`${tab.textContent} metrics coming soon for this video`);
    });
  });
}

function initEditableSelectAll() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[contenteditable="true"]');
    if (!el) return;
    if (document.activeElement !== el) {
      setTimeout(() => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }, 10);
    }
  });
}

function initRealtimeThumbnails() {
  const thumbs = document.querySelectorAll('.rt-thumb-custom');
  thumbs.forEach((thumb, idx) => {
    thumb.style.cursor = 'pointer';
    const input = document.getElementById(`rtThumbInput${idx}`);

    thumb.addEventListener('click', () => input?.click());

    input?.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const src = e.target.result;
        thumb.style.background = `url(${src}) center/cover no-repeat`;
        thumb.querySelector('.rt-thumb-play').style.display = 'none';
        localStorage.setItem(`yt_replica_${thumb.dataset.persistId}`, src);
      };
      reader.readAsDataURL(file);
    });
  });
}

function initTopContentThumbnails() {
  const container = document.getElementById('topContentBody');
  if (!container) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.id = 'topContentThumbInput';
  input.style.display = 'none';
  document.body.appendChild(input);

  let currentThumb = null;

  container.addEventListener('click', e => {
    const thumb = e.target.closest('.top-content-thumb');
    if (thumb) {
      currentThumb = thumb;
      input.click();
    }
  });

  input.addEventListener('change', function () {
    const file = this.files[0];
    if (!file || !currentThumb) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target.result;
      currentThumb.style.background = `url(${src}) center/cover no-repeat`;
      const playIcon = currentThumb.querySelector('.thumb-play-icon');
      if (playIcon) playIcon.style.display = 'none';
      localStorage.setItem(`yt_replica_${currentThumb.dataset.persistId}`, src);
    };
    reader.readAsDataURL(file);
  });
}


// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initEditableSelectAll();
  initLiveCounter();
  initTabs();
  initSubTabs();
  initFilterBtns();
  populateTopContent();
  populateContentTable();
  populateComments();
  initCharts();
  initPersistence();
  initAvatarUpload();
  initRealtimeThumbnails();
  initTopContentThumbnails();
  initProfileModal();
  initDateRange();
  initSaveBtns();
  initCreateBtn();
  initPagination();
  initVideoAnalyticsBack();
  initVideoAnalyticsSubTabs();
});
