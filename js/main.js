/* ===================================================
   TAB NAVIGATION
=================================================== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dashboard-page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById(tab).classList.add('active');
    initTab(tab);
  });
});

const initialized = {};
function initTab(tab) {
  if (initialized[tab]) return;
  initialized[tab] = true;
  if (tab === 'operations')    initOperations();
  if (tab === 'analytics')     initAnalytics();
  if (tab === 'system-health') initSystem();
  if (tab === 'radiologist')   initRadiologist();
}

/* ===================================================
   CHART DEFAULTS
=================================================== */
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#94A3B8';
Chart.defaults.plugins.legend.display = false;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function gridOpts()    { return { color: '#F1F5F9', drawBorder: false }; }
function tickOpts(s)   { return { color: '#CBD5E1', font: { size: s || 10 } }; }
function pointerCursor(evt, els) { evt.native.target.style.cursor = els.length ? 'pointer' : 'default'; }

/* ===================================================
   DRILL-DOWN MODAL
=================================================== */
const overlay   = document.getElementById('drillOverlay');
const drillBody = document.getElementById('drillBody');
let drillInstances = [];

function openDrill(crumb, title, buildFn) {
  drillInstances.forEach(c => c.destroy());
  drillInstances = [];
  drillBody.innerHTML = '';
  document.getElementById('drillCrumb').textContent  = crumb;
  document.getElementById('drillTitle').textContent  = title;
  overlay.classList.add('active');
  buildFn();
}

function closeDrill() {
  overlay.classList.remove('active');
  drillInstances.forEach(c => c.destroy());
  drillInstances = [];
}

document.getElementById('drillCloseBtn').addEventListener('click', closeDrill);
overlay.addEventListener('click', e => { if (e.target === overlay) closeDrill(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrill(); });

function drillNewChart(id, config) {
  const c = new Chart(document.getElementById(id), config);
  drillInstances.push(c);
  return c;
}

/* ===================================================
   DRILL-DOWN DATA
=================================================== */

// 1. Operations — referrals by dept for each day of the week
const REFERRAL_BY_DAY = [
  { Cardiology: 45, Pediatrics: 30, 'Gen. Surgery': 28, Oncology: 34, Pulmonology: 21 },
  { Cardiology: 58, Pediatrics: 42, 'Gen. Surgery': 36, Oncology: 38, Pulmonology: 18 },
  { Cardiology: 71, Pediatrics: 50, 'Gen. Surgery': 44, Oncology: 35, Pulmonology: 21 },
  { Cardiology: 88, Pediatrics: 56, 'Gen. Surgery': 51, Oncology: 28, Pulmonology: 22 },
  { Cardiology: 76, Pediatrics: 44, 'Gen. Surgery': 38, Oncology: 30, Pulmonology: 20 },
  { Cardiology: 38, Pediatrics: 28, 'Gen. Surgery': 22, Oncology: 18, Pulmonology: 13 },
  { Cardiology: 24, Pediatrics: 14, 'Gen. Surgery': 12, Oncology: 12, Pulmonology:  9 },
];

// 2. Analytics — studies by modality for each day
const STUDIES_BY_DAY = [
  { CT: 130, MRI: 80,  'X-Ray': 118, US: 58,  Other: 34 },
  { CT: 210, MRI: 130, 'X-Ray': 192, US: 96,  Other: 52 },
  { CT: 285, MRI: 175, 'X-Ray': 258, US: 130, Other: 72 },
  { CT: 340, MRI: 209, 'X-Ray': 308, US: 155, Other: 88 },
  { CT: 458, MRI: 281, 'X-Ray': 414, US: 208, Other: 119 },
  { CT: 260, MRI: 160, 'X-Ray': 236, US: 118, Other: 66 },
  { CT: 387, MRI: 238, 'X-Ray': 354, US: 178, Other: 93 },
];

// 3. Analytics — sub-types per modality slice
const MODALITY_SUBTYPES = {
  CT:         { 'Chest CT': 38,    'Abdomen CT': 29, 'Head CT': 24,    'Spine CT': 18,     'Extremity CT': 11, 'Pelvis CT': 9 },
  MRI:        { 'Brain MRI': 45,   'Spine MRI': 38,  'Knee MRI': 28,   'Shoulder MRI': 15, 'Abdomen MRI': 12, 'Other MRI': 8 },
  'X-Ray':    { 'Chest X-Ray': 112,'Extremity XR': 88,'Spine XR': 54,  'Abdomen XR': 24,   'Other XR': 18 },
  Ultrasound: { 'Abdominal US': 52,'Vascular US': 34, 'OB/GYN US': 28, 'Thyroid US': 18,   'Other US': 16 },
  Other:      { 'Fluoroscopy': 28, 'Nuclear Med': 24, 'Mammography': 18,'Bone Density': 10 },
};

// 4. Radiologist — per-radiologist detail
const RAD_DETAIL = {
  'Dr. Kim':    { modality: { CT:28,MRI:18,'X-Ray':14,US:8,MG:4 }, daily:[11,14,10,16,13,5,3], avgTAT:'3.1h', critical:3,  total:72 },
  'Dr. Park':   { modality: { CT:22,MRI:16,'X-Ray':15,US:7,MG:4 }, daily:[9,12,11,14,10,5,3],  avgTAT:'3.6h', critical:7,  total:64 },
  'Dr. Torres': { modality: { CT:20,MRI:14,'X-Ray':12,US:6,MG:3 }, daily:[8,10,9,12,9,4,3],   avgTAT:'2.8h', critical:2,  total:55 },
  'Dr. Webb':   { modality: { CT:16,MRI:11,'X-Ray':10,US:4,MG:2 }, daily:[6,9,8,10,7,2,1],    avgTAT:'4.7h', critical:9,  total:43 },
  'Dr. Huang':  { modality: { CT:14,MRI:10,'X-Ray':8, US:4,MG:2 }, daily:[5,7,6,8,7,3,2],    avgTAT:'3.3h', critical:1,  total:38 },
};

// 5. Radiologist — overdue cases per day (index 0=Mon … 6=Sun)
const OVERDUE_CASES = [
  [ // Mon
    { id:'STU-5514', patient:'MOORE, Patricia',  mod:'CT',    rad:'Dr. Webb',   hrs:'2.1' },
    { id:'STU-5521', patient:'NGUYEN, David',    mod:'MRI',   rad:'Dr. Park',   hrs:'1.4' },
    { id:'STU-5533', patient:'HARRIS, Linda',    mod:'X-Ray', rad:'Dr. Kim',    hrs:'0.8' },
  ],
  [ // Tue
    { id:'STU-5602', patient:'GARCIA, Carlos',   mod:'CT',    rad:'Dr. Park',   hrs:'3.2' },
    { id:'STU-5618', patient:'WILSON, Anne',     mod:'US',    rad:'Dr. Webb',   hrs:'2.7' },
    { id:'STU-5624', patient:'TAYLOR, Robert',   mod:'MRI',   rad:'Dr. Torres', hrs:'1.9' },
    { id:'STU-5631', patient:'ANDERSON, Sue',    mod:'X-Ray', rad:'Dr. Park',   hrs:'1.1' },
  ],
  [ // Wed
    { id:'STU-5701', patient:'MARTINEZ, Jose',   mod:'CT',    rad:'Dr. Webb',   hrs:'4.1' },
    { id:'STU-5712', patient:'THOMAS, Kevin',    mod:'MRI',   rad:'Dr. Webb',   hrs:'3.5' },
    { id:'STU-5729', patient:'JACKSON, Mary',    mod:'CT',    rad:'Dr. Park',   hrs:'2.3' },
    { id:'STU-5745', patient:'WHITE, James',     mod:'US',    rad:'Dr. Kim',    hrs:'1.6' },
  ],
  [ // Thu
    { id:'STU-5801', patient:'LEWIS, Dorothy',   mod:'MRI',   rad:'Dr. Webb',   hrs:'5.0' },
    { id:'STU-5813', patient:'CLARK, Richard',   mod:'CT',    rad:'Dr. Park',   hrs:'4.2' },
    { id:'STU-5822', patient:'ROBINSON, Helen',  mod:'X-Ray', rad:'Dr. Webb',   hrs:'3.1' },
    { id:'STU-5835', patient:'WALKER, Chris',    mod:'CT',    rad:'Dr. Torres', hrs:'2.8' },
    { id:'STU-5841', patient:'HALL, Barbara',    mod:'MRI',   rad:'Dr. Park',   hrs:'1.7' },
  ],
  [ // Fri
    { id:'STU-5904', patient:'ALLEN, Thomas',    mod:'CT',    rad:'Dr. Webb',   hrs:'4.8' },
    { id:'STU-5916', patient:'YOUNG, Sandra',    mod:'MRI',   rad:'Dr. Park',   hrs:'3.4' },
    { id:'STU-5927', patient:'KING, Joseph',     mod:'US',    rad:'Dr. Webb',   hrs:'2.9' },
    { id:'STU-5938', patient:'SCOTT, Karen',     mod:'X-Ray', rad:'Dr. Kim',    hrs:'1.2' },
  ],
  [ // Sat
    { id:'STU-6012', patient:'GREEN, Betty',     mod:'CT',    rad:'Dr. Kim',    hrs:'2.2' },
    { id:'STU-6024', patient:'ADAMS, Mark',      mod:'MRI',   rad:'Dr. Park',   hrs:'1.8' },
  ],
  [ // Sun
    { id:'STU-6108', patient:'BAKER, Nancy',     mod:'CT',    rad:'Dr. Torres', hrs:'3.0' },
    { id:'STU-6115', patient:'NELSON, George',   mod:'X-Ray', rad:'Dr. Kim',    hrs:'1.5' },
  ],
];

/* ===================================================
   DRILL RENDERERS
=================================================== */

// 1. Referral Trend → day breakdown
function drillReferralDay(dayIdx) {
  const dayData = REFERRAL_BY_DAY[dayIdx];
  const depts   = Object.keys(dayData);
  const counts  = Object.values(dayData);
  const total   = counts.reduce((a, b) => a + b, 0);
  const colors  = ['#4F46E5','#F97316','#22C55E','#EF4444','#F59E0B'];

  openDrill('Operations › Referral Trend', `${FULL_DAYS[dayIdx]} — Referral Breakdown`, () => {
    drillBody.innerHTML = `
      <p class="drill-hint">Showing referral distribution by department for <strong>${FULL_DAYS[dayIdx]}</strong></p>
      <div class="drill-stat-row">
        <div class="drill-stat">
          <div class="drill-stat-label">Total Referrals</div>
          <div class="drill-stat-value">${total}</div>
          <div class="drill-stat-sub">${FULL_DAYS[dayIdx]}</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Top Source</div>
          <div class="drill-stat-value" style="font-size:16px">${depts[0]}</div>
          <div class="drill-stat-sub">${counts[0]} referrals</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Top Share</div>
          <div class="drill-stat-value">${Math.round(counts[0]/total*100)}%</div>
          <div class="drill-stat-sub">of all referrals</div>
        </div>
      </div>
      <div class="drill-grid-2">
        <div class="drill-chart-box" style="height:200px;position:relative">
          <canvas id="drillDonut"></canvas>
        </div>
        <div>
          <div class="drill-section">By Department</div>
          <table class="drill-table">
            <thead><tr><th>Department</th><th>Count</th><th>Share</th></tr></thead>
            <tbody>
              ${depts.map((d,i) => `
                <tr>
                  <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${colors[i]};margin-right:6px"></span>${d}</td>
                  <td><strong>${counts[i]}</strong></td>
                  <td>${Math.round(counts[i]/total*100)}%</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    drillNewChart('drillDonut', {
      type: 'doughnut',
      data: { labels: depts, datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } } } }
    });
  });
}

// 2. Studies Trend → modality breakdown for that day
function drillStudiesDay(dayIdx) {
  const d      = STUDIES_BY_DAY[dayIdx];
  const mods   = Object.keys(d);
  const counts = Object.values(d);
  const total  = counts.reduce((a, b) => a + b, 0);
  const bgs    = ['#4F46E5','#F97316','#22C55E','#8B5CF6','#F59E0B'];

  openDrill('Analytics › Studies Trend', `${FULL_DAYS[dayIdx]} — Studies by Modality`, () => {
    drillBody.innerHTML = `
      <p class="drill-hint">Click a bar for further sub-type detail.</p>
      <div class="drill-stat-row">
        <div class="drill-stat">
          <div class="drill-stat-label">Total Studies</div>
          <div class="drill-stat-value">${total.toLocaleString()}</div>
          <div class="drill-stat-sub">${FULL_DAYS[dayIdx]}</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Highest Volume</div>
          <div class="drill-stat-value" style="font-size:16px">${mods[counts.indexOf(Math.max(...counts))]}</div>
          <div class="drill-stat-sub">${Math.max(...counts)} studies</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Lowest Volume</div>
          <div class="drill-stat-value" style="font-size:16px">${mods[counts.indexOf(Math.min(...counts))]}</div>
          <div class="drill-stat-sub">${Math.min(...counts)} studies</div>
        </div>
      </div>
      <div class="drill-chart-box" style="height:220px">
        <canvas id="drillBar"></canvas>
      </div>
      <table class="drill-table" style="margin-top:16px">
        <thead><tr><th>Modality</th><th>Studies</th><th>% of Day</th></tr></thead>
        <tbody>
          ${mods.map((m,i) => `
            <tr>
              <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${bgs[i]};margin-right:6px"></span>${m}</td>
              <td><strong>${counts[i]}</strong></td>
              <td>${Math.round(counts[i]/total*100)}%</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    drillNewChart('drillBar', {
      type: 'bar',
      data: { labels: mods, datasets: [{ data: counts, backgroundColor: bgs, borderRadius: 5, barPercentage: 0.55 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} studies (${Math.round(ctx.parsed.y/total*100)}%)` } } },
        scales: { x: { grid: gridOpts(), ticks: tickOpts() }, y: { grid: gridOpts(), ticks: tickOpts(), border: { display: false } } },
        onHover: pointerCursor,
        onClick: (evt, els) => {
          if (!els.length) return;
          const mod = mods[els[0].index];
          if (MODALITY_SUBTYPES[mod]) drillModalityDetail(mod);
        }
      }
    });
  });
}

// 3. Modality donut → sub-type breakdown (also reachable from studies day drill)
function drillModalityDetail(modName) {
  const sub    = MODALITY_SUBTYPES[modName];
  const labels = Object.keys(sub);
  const vals   = Object.values(sub);
  const total  = vals.reduce((a, b) => a + b, 0);

  openDrill('Analytics › Studies by Modality', `${modName} — Sub-type Breakdown`, () => {
    drillBody.innerHTML = `
      <p class="drill-hint">Showing all procedure sub-types within <strong>${modName}</strong></p>
      <div class="drill-stat-row" style="grid-template-columns:1fr 1fr 1fr">
        <div class="drill-stat">
          <div class="drill-stat-label">Total Studies</div>
          <div class="drill-stat-value">${total}</div>
          <div class="drill-stat-sub">${modName}</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Sub-types</div>
          <div class="drill-stat-value">${labels.length}</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Most Common</div>
          <div class="drill-stat-value" style="font-size:14px">${labels[0]}</div>
          <div class="drill-stat-sub">${vals[0]} studies</div>
        </div>
      </div>
      <div class="drill-section">Volume by Sub-type</div>
      <div class="drill-chart-box" style="height:${Math.max(160, labels.length * 32)}px">
        <canvas id="drillHBar"></canvas>
      </div>`;

    drillNewChart('drillHBar', {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: vals, backgroundColor: '#4F46E5', borderRadius: 4, barPercentage: 0.6 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} studies` } } },
        scales: {
          x: { grid: gridOpts(), ticks: tickOpts(), border: { display: false } },
          y: { grid: { display: false }, ticks: tickOpts(11) }
        }
      }
    });
  });
}

// 4. Studies per Radiologist → radiologist detail
function drillRadiologist(name) {
  const d       = RAD_DETAIL[name];
  const mods    = Object.keys(d.modality);
  const modVals = Object.values(d.modality);
  const modBgs  = ['#4F46E5','#F97316','#22C55E','#8B5CF6','#F59E0B'];
  const tatColor = parseFloat(d.avgTAT) > 4 ? 'bad' : parseFloat(d.avgTAT) > 3 ? 'warn' : 'good';

  openDrill('Radiologist › Studies per Radiologist', `${name} — Performance Detail`, () => {
    drillBody.innerHTML = `
      <div class="drill-stat-row">
        <div class="drill-stat">
          <div class="drill-stat-label">Total Studies</div>
          <div class="drill-stat-value">${d.total}</div>
          <div class="drill-stat-sub">This week</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Avg TAT</div>
          <div class="drill-stat-value">${d.avgTAT}</div>
          <div class="drill-stat-sub"><span class="drill-badge ${tatColor}">${tatColor === 'good' ? '✓ Within target' : tatColor === 'warn' ? '⚠ Near target' : '✕ Above target'}</span></div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Critical Cases</div>
          <div class="drill-stat-value">${d.critical}</div>
          <div class="drill-stat-sub drill-badge ${d.critical >= 7 ? 'bad' : d.critical >= 4 ? 'warn' : 'good'}">${d.critical >= 7 ? 'High' : d.critical >= 4 ? 'Moderate' : 'Low'} volume</div>
        </div>
      </div>
      <div class="drill-grid-2">
        <div>
          <div class="drill-section">Modality Mix</div>
          <div class="drill-chart-box" style="height:180px;position:relative">
            <canvas id="drillModDonut"></canvas>
          </div>
        </div>
        <div>
          <div class="drill-section">Daily Study Volume</div>
          <div class="drill-chart-box" style="height:180px">
            <canvas id="drillDailyLine"></canvas>
          </div>
        </div>
      </div>
      <div class="drill-section">Modality Breakdown</div>
      <table class="drill-table">
        <thead><tr><th>Modality</th><th>Studies</th><th>Share</th></tr></thead>
        <tbody>
          ${mods.map((m,i) => `
            <tr>
              <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${modBgs[i]};margin-right:6px"></span>${m}</td>
              <td><strong>${modVals[i]}</strong></td>
              <td>${Math.round(modVals[i]/d.total*100)}%</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    drillNewChart('drillModDonut', {
      type: 'doughnut',
      data: { labels: mods, datasets: [{ data: modVals, backgroundColor: modBgs, borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 9 }, boxWidth: 8, padding: 6 } } } }
    });

    drillNewChart('drillDailyLine', {
      type: 'line',
      data: {
        labels: DAYS,
        datasets: [{
          data: d.daily, borderColor: '#4F46E5',
          backgroundColor: 'rgba(79,70,229,.1)', fill: true,
          tension: 0.4, pointRadius: 3,
          pointBackgroundColor: '#4F46E5', pointBorderColor: '#fff', pointBorderWidth: 2,
        }]
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: gridOpts(), ticks: tickOpts() }, y: { grid: gridOpts(), ticks: tickOpts(), border: { display: false } } }
      }
    });
  });
}

// 5. Pending & Overdue Trend → overdue case list for that day
function drillOverdueDay(dayIdx) {
  const cases   = OVERDUE_CASES[dayIdx];
  const pending = [32,38,42,51,47,35,31][dayIdx];
  const overdue = [22,26,28,35,31,25,22][dayIdx];

  openDrill('Radiologist › Pending & Overdue Trend', `${FULL_DAYS[dayIdx]} — Overdue Case Details`, () => {
    drillBody.innerHTML = `
      <div class="drill-stat-row">
        <div class="drill-stat">
          <div class="drill-stat-label">Pending Studies</div>
          <div class="drill-stat-value">${pending}</div>
          <div class="drill-stat-sub">${FULL_DAYS[dayIdx]}</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Overdue Studies</div>
          <div class="drill-stat-value" style="color:#DC2626">${overdue}</div>
          <div class="drill-stat-sub drill-badge bad">Requires attention</div>
        </div>
        <div class="drill-stat">
          <div class="drill-stat-label">Cases Listed</div>
          <div class="drill-stat-value">${cases.length}</div>
          <div class="drill-stat-sub">Longest overdue shown first</div>
        </div>
      </div>
      <div class="drill-section">Overdue Case List</div>
      <table class="drill-table">
        <thead>
          <tr><th>Study ID</th><th>Patient</th><th>Modality</th><th>Assigned To</th><th>Hours Overdue</th></tr>
        </thead>
        <tbody>
          ${[...cases].sort((a,b)=>parseFloat(b.hrs)-parseFloat(a.hrs)).map(c => `
            <tr>
              <td style="font-family:monospace;font-size:11px;color:#64748B">${c.id}</td>
              <td>${c.patient}</td>
              <td><span class="mod-tag">${c.mod}</span></td>
              <td>${c.rad}</td>
              <td><span class="overdue-tag">+${c.hrs} hrs</span></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  });
}

/* ===================================================
   OPERATIONS
=================================================== */
function initOperations() {
  new Chart(document.getElementById('referralTrendChart'), {
    type: 'bar',
    data: {
      labels: DAYS,
      datasets: [{
        data: [158, 192, 221, 245, 208, 119, 71],
        backgroundColor: '#0EA5E9',
        borderRadius: 5,
        barPercentage: 0.55,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.parsed.y + ' referrals — click for breakdown' } }
      },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts() },
        y: { grid: gridOpts(), ticks: tickOpts(), min: 0, max: 280, border: { display: false } }
      },
      onHover: pointerCursor,
      onClick: (evt, els) => { if (els.length) drillReferralDay(els[0].index); }
    }
  });

  // Mark chart as clickable via cursor
  document.getElementById('referralTrendChart').classList.add('clickable-chart');
}

/* ===================================================
   ANALYTICS
=================================================== */
function initAnalytics() {
  // Studies Trend — clickable
  new Chart(document.getElementById('studiesTrendChart'), {
    type: 'line',
    data: {
      labels: DAYS,
      datasets: [{
        data: [420, 680, 920, 1100, 1480, 840, 1250],
        borderColor: '#0EA5E9',
        backgroundColor: 'rgba(14,165,233,.1)',
        fill: true, tension: 0.42,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBackgroundColor: '#0EA5E9',
        pointBorderColor: '#fff', pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} studies — click for modality breakdown` } }
      },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts() },
        y: { grid: { color: '#F1F5F9', dash: [4,4] }, ticks: tickOpts(), min: 0, max: 1700, border: { display: false } }
      },
      onHover: pointerCursor,
      onClick: (evt, els) => { if (els.length) drillStudiesDay(els[0].index); }
    }
  });
  document.getElementById('studiesTrendChart').classList.add('clickable-chart');

  // Studies by Modality — clickable donut
  new Chart(document.getElementById('studiesModalityDonut'), {
    type: 'doughnut',
    data: {
      labels: ['CT', 'MRI', 'X-Ray', 'Ultrasound', 'Other'],
      datasets: [{
        data: [31, 19, 28, 14, 8],
        backgroundColor: ['#4F46E5','#F97316','#22C55E','#8B5CF6','#F59E0B'],
        borderWidth: 2, borderColor: '#fff', hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}% — click for sub-types` } }
      },
      onHover: pointerCursor,
      onClick: (evt, els) => {
        if (!els.length) return;
        const names = ['CT','MRI','X-Ray','Ultrasound','Other'];
        drillModalityDetail(names[els[0].index]);
      }
    }
  });
  document.getElementById('studiesModalityDonut').classList.add('clickable-chart');

  // STAT vs Routine
  new Chart(document.getElementById('statRoutineChart'), {
    type: 'bar',
    data: {
      labels: DAYS,
      datasets: [
        { label:'STAT',    data:[9,14,17,21,31,8,6],  backgroundColor:'#EF4444', borderRadius:{topLeft:4,topRight:4}, barPercentage:0.55 },
        { label:'Routine', data:[28,35,38,32,24,12,8], backgroundColor:'rgba(239,68,68,.2)', borderRadius:{topLeft:4,topRight:4}, barPercentage:0.55 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { stacked: false, grid: gridOpts(), ticks: tickOpts() },
        y: { stacked: false, grid: gridOpts(), ticks: tickOpts(), max: 50, border: { display: false } }
      }
    }
  });

  // Storage Trend
  new Chart(document.getElementById('storageTrendChart'), {
    type: 'line',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [{
        data: [6.2, 6.8, 7.1, 7.5, 7.3, 7.9, 8.4],
        borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,.08)',
        fill: true, tension: 0.4, pointRadius: 3,
        pointBackgroundColor: '#8B5CF6', pointBorderColor: '#fff', pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpts(), ticks: { ...tickOpts(), maxRotation: 0, font: { size: 9 } } },
        y: { grid: gridOpts(), ticks: { ...tickOpts(), callback: v => v + ' TB' }, min: 5, max: 10, border: { display: false } }
      }
    }
  });

  // Technologist bar
  new Chart(document.getElementById('techStudiesChart'), {
    type: 'bar',
    data: {
      labels: ['Tom A.','Lisa B.','Carlos M.','Priya N.','Mark S.'],
      datasets: [{ data: [88,142,118,75,96], backgroundColor: '#10B981', borderRadius: 5, barPercentage: 0.55 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts() },
        y: { grid: gridOpts(), ticks: tickOpts(), min: 0, max: 170, border: { display: false } }
      }
    }
  });

  // Referring Providers
  new Chart(document.getElementById('referringProvidersChart'), {
    type: 'bar',
    data: {
      labels: ['Dr. Johnson','Dr. Martinez','Dr. Williams','Dr. Chang','Dr. Okafor','Dr. Patel'],
      datasets: [{ data: [186,154,128,102,89,71], backgroundColor: '#0EA5E9', borderRadius: 4, barPercentage: 0.6 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts(), max: 220, border: { display: false } },
        y: { grid: { display: false }, ticks: tickOpts() }
      }
    }
  });

  // Radiologist RVUs
  new Chart(document.getElementById('radiologistRvuChart'), {
    type: 'bar',
    data: {
      labels: ['Dr. Kim','Dr. Park','Dr. Torres','Dr. Webb','Dr. Huang','Dr. Liu','Dr. Santos'],
      datasets: [{ data: [310,270,390,180,350,430,410], backgroundColor: '#F59E0B', borderRadius: 4, barPercentage: 0.6 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts(), max: 480, border: { display: false } },
        y: { grid: { display: false }, ticks: tickOpts() }
      }
    }
  });
}

/* ===================================================
   SYSTEM
=================================================== */
function initSystem() {
  new Chart(document.getElementById('storageGrowthChart'), {
    type: 'line',
    data: {
      labels: DAYS,
      datasets: [{
        data: [420,430,440,448,452,456,461],
        borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,.12)',
        fill: true, tension: 0.35, pointRadius: 3,
        pointBackgroundColor: '#10B981', pointBorderColor: '#fff', pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts() },
        y: { grid: gridOpts(), ticks: { ...tickOpts(), callback: v => v+'T' }, min: 380, max: 500, border: { display: false } }
      }
    }
  });

  new Chart(document.getElementById('storageModalityChart'), {
    type: 'doughnut',
    data: {
      labels: ['CT','MRI','X-Ray','US','MG'],
      datasets: [{ data: [38,35,14,9,4], backgroundColor: ['#4F46E5','#22C55E','#F97316','#F59E0B','#8B5CF6'], borderWidth: 0, hoverOffset: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } }
  });

  function makeGauge(id, v, color) {
    new Chart(document.getElementById(id), {
      type: 'doughnut',
      data: { datasets: [{ data: [v, 100-v], backgroundColor: [color,'#F1F5F9'], borderWidth: 0 }] },
      options: { responsive: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
  }
  makeGauge('core1Gauge', 45, '#22C55E');
  makeGauge('core2Gauge', 71, '#F59E0B');
  makeGauge('core3Gauge', 28, '#22C55E');
  makeGauge('core4Gauge', 63, '#F59E0B');

  function makeMemGauge(id, v, color) {
    new Chart(document.getElementById(id), {
      type: 'doughnut',
      data: { datasets: [{ data: [v, 100-v], backgroundColor: [color,'#F1F5F9'], borderWidth: 0 }] },
      options: { responsive: false, cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
  }
  makeMemGauge('dramGauge',  82, '#EF4444');
  makeMemGauge('cacheGauge', 55, '#4F46E5');
}

/* ===================================================
   RADIOLOGIST
=================================================== */
function initRadiologist() {
  // Studies per Radiologist — clickable
  new Chart(document.getElementById('studiesPerRadChart'), {
    type: 'bar',
    data: {
      labels: ['Dr. Kim','Dr. Park','Dr. Torres','Dr. Webb','Dr. Huang'],
      datasets: [{ data: [72,64,55,43,38], backgroundColor: '#4F46E5', borderRadius: 4, barPercentage: 0.55 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} studies — click for detail` } }
      },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts(), max: 85, border: { display: false } },
        y: { grid: { display: false }, ticks: tickOpts() }
      },
      onHover: pointerCursor,
      onClick: (evt, els) => {
        if (!els.length) return;
        const names = ['Dr. Kim','Dr. Park','Dr. Torres','Dr. Webb','Dr. Huang'];
        drillRadiologist(names[els[0].index]);
      }
    }
  });
  document.getElementById('studiesPerRadChart').classList.add('clickable-chart');

  // TAT by Radiologist
  new Chart(document.getElementById('tatByRadChart'), {
    type: 'bar',
    data: {
      labels: ['Dr. Kim','Dr. Park','Dr. Torres','Dr. Webb','Dr. Huang'],
      datasets: [
        { label:'CT Scan', data:[2.1,2.5,1.9,2.8,2.2], backgroundColor:'#4F46E5', barPercentage:0.55 },
        { label:'MRI',     data:[1.8,2.2,1.7,2.4,2.0], backgroundColor:'#F97316', barPercentage:0.55 },
        { label:'X-Ray',   data:[1.2,1.5,1.1,1.8,1.3], backgroundColor:'#22C55E', barPercentage:0.55 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { stacked: true, grid: gridOpts(), ticks: tickOpts() },
        y: { stacked: true, grid: gridOpts(), ticks: { ...tickOpts(), callback: v => v+'h' }, max: 9, border: { display: false } }
      }
    }
  });

  // Pending & Overdue — clickable
  new Chart(document.getElementById('pendingOverdueChart'), {
    type: 'line',
    data: {
      labels: DAYS,
      datasets: [
        {
          label:'Pending',
          data:[32,38,42,51,47,35,31],
          borderColor:'#F97316', backgroundColor:'rgba(249,115,22,.15)',
          fill:true, tension:0.4, pointRadius:5, pointHoverRadius:8,
          pointBackgroundColor:'#F97316',
        },
        {
          label:'Overdue',
          data:[22,26,28,35,31,25,22],
          borderColor:'#EF4444', backgroundColor:'rgba(239,68,68,.1)',
          fill:true, tension:0.4, pointRadius:5, pointHoverRadius:8,
          pointBackgroundColor:'#EF4444',
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} — click to view cases` } }
      },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts() },
        y: { grid: gridOpts(), ticks: tickOpts(), min: 0, max: 60, border: { display: false } }
      },
      onHover: pointerCursor,
      onClick: (evt, els) => { if (els.length) drillOverdueDay(els[0].index); }
    }
  });
  document.getElementById('pendingOverdueChart').classList.add('clickable-chart');

  // Studies by Modality
  new Chart(document.getElementById('radStudiesModalityChart'), {
    type: 'bar',
    data: {
      labels: ['CR','CT','MR','MG','US'],
      datasets: [{ label:'Study Count', data:[280,195,125,65,340], backgroundColor:'#4F46E5', borderRadius:5, barPercentage:0.55 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpts(), ticks: tickOpts() },
        y: { grid: gridOpts(), ticks: tickOpts(), max: 400, border: { display: false } }
      }
    }
  });

  // Referring Provider
  new Chart(document.getElementById('studiesReferringChart'), {
    type: 'bar',
    data: {
      labels: ['Dr. Johnson','Dr. Martinez','Dr. Williams','Dr. Chang','Dr. Patel'],
      datasets: [{ data:[64,52,44,38,21], backgroundColor:['#F97316','#4F46E5','#4F46E5','#4F46E5','#4F46E5'], borderRadius:4, barPercentage:0.55 }]
    },
    options: {
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ grid:gridOpts(), ticks:tickOpts(), max:80, border:{display:false} },
        y:{ grid:{display:false}, ticks:tickOpts() }
      }
    }
  });

  // Peer Review sparkline
  new Chart(document.getElementById('peerReviewTrendChart'), {
    type: 'line',
    data: {
      labels: DAYS,
      datasets: [
        { label:'Completed', data:[9,11,8,7,9,5,3], borderColor:'#22C55E', fill:false, tension:0.4, pointRadius:2 },
        { label:'Pending',   data:[18,22,25,28,26,28,28], borderColor:'#EF4444', fill:false, tension:0.4, pointRadius:2 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ x:{display:false}, y:{display:false} }
    }
  });
}

/* ===================================================
   BOOT
=================================================== */
initTab('operations');
