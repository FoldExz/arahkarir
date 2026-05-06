'use strict';

// ============================================================
//  ARAH KARIR — Frontend Script v4
//  Handles: D3 Constellation UI, career detail modal (tabbed),
//           AI assessment with match score
// ============================================================

// ── Constellation State ──────────────────────────────────────
let allCareers = [];          // full dataset from API
let activeCategory = 'all';   // current filter

// ============================================================
//  STATE
// ============================================================
let currentCareer = null;

// ============================================================
//  DOM References
// ============================================================
const careersLoading = document.getElementById('careers-loading');
const careersError   = document.getElementById('careers-error');
const svgEl          = document.getElementById('constellation-svg');
const catFilterBar   = document.getElementById('cat-filter-bar');

const modalOverlay    = document.getElementById('modal-overlay');
const modalClose      = document.getElementById('modal-close');

// Modal header
const modalCareerEmoji    = document.getElementById('modal-career-emoji');
const modalCareerCategory = document.getElementById('modal-career-category');
const modalCareerTitle    = document.getElementById('modal-career-title');

// Tabs
const tabDetail  = document.getElementById('tab-detail');
const tabAssess  = document.getElementById('tab-assess');
const panelDetail = document.getElementById('panel-detail');
const panelAssess = document.getElementById('panel-assess');

// Panel 1: Detail
const modalCareerDesc   = document.getElementById('modal-career-desc');
const modalCareerSalary = document.getElementById('modal-career-salary');
const modalCareerDemand = document.getElementById('modal-career-demand');
const modalCareerWork   = document.getElementById('modal-career-work');
const modalTechStack    = document.getElementById('modal-tech-stack');
const modalCerts        = document.getElementById('modal-certs');
const modalRoadmapLink  = document.getElementById('modal-roadmap-link');
const modalRoadmapBox   = document.getElementById('modal-roadmap-box');
const btnGoAssess       = document.getElementById('btn-go-assess');

// Panel 2: Assessment
const assessFormWrapper   = document.getElementById('assess-form-wrapper');
const assessResultWrapper = document.getElementById('assess-result-wrapper');
const assessForm          = document.getElementById('assess-form');
const userStoryInput      = document.getElementById('user-story-input');
const charCount           = document.getElementById('char-count');
const assessBtnText       = document.getElementById('assess-btn-text');
const assessBtnLoading    = document.getElementById('assess-btn-loading');

// Result elements
const matchProgressCircle = document.getElementById('match-progress-circle');
const matchNumber         = document.getElementById('match-number');
const matchLabelBadge     = document.getElementById('match-label-badge');
const matchCareerName     = document.getElementById('match-career-name');
const resRealityCheck     = document.getElementById('res-reality-check');
const resSkillGaps        = document.getElementById('res-skill-gaps');
const resActionPlan       = document.getElementById('res-action-plan');
const resFirstStep        = document.getElementById('res-first-step');
const resCerts            = document.getElementById('res-certs');

// Action buttons
const btnReanalyze       = document.getElementById('btn-reanalyze');
const btnCloseModalResult = document.getElementById('btn-close-modal-result');

// Toast
const toastEl  = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');

// ============================================================
//  LOAD CAREERS from /api/careers
// ============================================================
async function loadCareers() {
  try {
    const res = await fetch('/api/careers');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allCareers = await res.json();
    careersLoading.classList.add('hidden');
    // Update hero stat
    const statEl = document.getElementById('stat-career-count');
    if (statEl) statEl.querySelector('strong').textContent = allCareers.length;
    renderFilterBar();
    renderConstellation(allCareers);
  } catch (err) {
    console.error('[loadCareers] Error:', err);
    careersLoading.classList.add('hidden');
    careersError.classList.remove('hidden');
  }
}

// ============================================================
//  RENDER Filter Bar (category pills)
// ============================================================
function renderFilterBar() {
  const cats = ['all', ...new Set(allCareers.map(c => c.category))];
  catFilterBar.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-pill' + (cat === 'all' ? ' active' : '');
    btn.textContent = cat === 'all' ? '✦ Semua' : cat;
    btn.dataset.cat = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const filtered = cat === 'all' ? allCareers : allCareers.filter(c => c.category === cat);
      renderConstellation(filtered);
    });
    catFilterBar.appendChild(btn);
  });
}

// ============================================================
//  RENDER Constellation (D3 force simulation)
// ============================================================
const CATEGORY_COLORS = {
  'Software Engineering':   '#7c6ff7',
  'Data & AI':              '#4ade80',
  'Cybersecurity':          '#f87171',
  'Infrastructure & Cloud': '#60a5fa',
  'Design & Product':       '#e96cdb',
  'Business & Product':     '#fbbf24',
  'Engineering & Hardware': '#fb923c',
  'Creative & Gaming':      '#a78bfa',
  'Creative & Media':       '#f472b6',
  'Science & Health':       '#34d399',
  'Agri & Green Tech':      '#86efac',
};

let simulation = null; // keep ref so we can stop on re-render

function renderConstellation(careers) {
  // Stop previous simulation
  if (simulation) simulation.stop();

  const svg = d3.select('#constellation-svg');
  svg.selectAll('*').remove();

  const W = svgEl.clientWidth  || window.innerWidth;
  const H = svgEl.clientHeight || window.innerHeight;
  const cx = W / 2, cy = H / 2;

  // ── Define nodes ──
  const centerNode = { id: '__center__', title: 'Explore', isCenter: true, x: cx, y: cy, fx: cx, fy: cy };
  const nodes = [centerNode, ...careers.map(c => ({ ...c, id: c.id_role }))];
  const links = careers.map(c => ({ source: '__center__', target: c.id_role }));

  // ── Zoom layer ──
  const g = svg.append('g').attr('class', 'zoom-layer');
  svg.call(d3.zoom().scaleExtent([0.3, 2.5]).on('zoom', e => g.attr('transform', e.transform)));

  // ── Link lines ──
  const link = g.append('g').selectAll('line')
    .data(links).join('line')
    .attr('class', 'c-link');

  // ── Node groups ──
  const node = g.append('g').selectAll('g.c-node')
    .data(nodes).join('g')
    .attr('class', 'c-node')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end',   (e, d) => { if (!e.active) simulation.alphaTarget(0); if (!d.isCenter) { d.fx = null; d.fy = null; } }));

  // ── Center node circle ──
  node.filter(d => d.isCenter).append('circle')
    .attr('r', 58).attr('class', 'c-center-ring');
  node.filter(d => d.isCenter).append('circle')
    .attr('r', 50).attr('class', 'c-center-core');
  node.filter(d => d.isCenter).append('text')
    .attr('class', 'c-center-label').attr('dy', '0.35em').text('Explore');

  // ── Career nodes ──
  const careerNodes = node.filter(d => !d.isCenter);
  careerNodes.append('circle')
    .attr('r', 10)
    .attr('class', 'c-dot')
    .style('fill', d => CATEGORY_COLORS[d.category] || '#7c6ff7');
  careerNodes.append('text')
    .attr('class', 'c-label')
    .attr('x', 16).attr('dy', '0.35em')
    .text(d => d.title);

  // ── Click → open modal ──
  careerNodes.style('cursor', 'pointer')
    .on('click', (e, d) => { e.stopPropagation(); openModal(d); });

  // ── Simulation ──
  // Collision radius dihitung dari panjang teks agar label tidak tumpang tindih
  const collisionRadius = d => d.isCenter ? 70 : Math.max(60, (d.title?.length || 10) * 4.5);

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(220).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-450).distanceMax(600))
    .force('collision', d3.forceCollide().radius(collisionRadius).strength(0.9))
    .force('center', d3.forceCenter(cx, cy).strength(0.04))
    .alphaDecay(0.02)
    .on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

// ============================================================
//  MODAL — Open & Close
// ============================================================
function openModal(career) {
  currentCareer = career;

  // Populate header
  modalCareerEmoji.textContent    = career.emoji;
  modalCareerCategory.textContent = career.category;
  modalCareerTitle.textContent    = career.title;

  // Populate Detail panel
  modalCareerDesc.textContent   = career.description;
  modalCareerSalary.textContent = career.salary_range_id;
  modalCareerDemand.textContent = career.demand_level;
  modalCareerWork.textContent   = career.work_style;
  // Conditional rendering: hanya tampilkan roadmap box jika URL tersedia
  if (career.roadmap_url) {
    modalRoadmapBox.classList.remove('hidden');
    modalRoadmapLink.href = career.roadmap_url;
  } else {
    modalRoadmapBox.classList.add('hidden');
    modalRoadmapLink.href = '#';
  }

  // Tech Stack chips
  modalTechStack.innerHTML = career.tech_stack
    .map((t) => `<span class="tech-chip">${t}</span>`)
    .join('');

  // Certifications list
  modalCerts.innerHTML = career.certifications
    .map((c) => `<div class="cert-item"><span class="cert-icon">🏆</span><span class="cert-name">${c}</span></div>`)
    .join('');

  // Reset to Detail tab
  switchTab('detail');

  // Reset assessment panel
  resetAssessment();

  // Show modal
  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ============================================================
//  TABS — Detail / Asesmen AI
// ============================================================
function switchTab(tab) {
  if (tab === 'detail') {
    tabDetail.classList.add('active');
    tabAssess.classList.remove('active');
    panelDetail.classList.remove('hidden');
    panelAssess.classList.add('hidden');
  } else {
    tabAssess.classList.add('active');
    tabDetail.classList.remove('active');
    panelAssess.classList.remove('hidden');
    panelDetail.classList.add('hidden');
  }
}

tabDetail.addEventListener('click', () => switchTab('detail'));
tabAssess.addEventListener('click', () => switchTab('assess'));

// "Cek Kecocokan" button on Detail panel → go to Assess tab
btnGoAssess.addEventListener('click', () => switchTab('assess'));

// ============================================================
//  Modal close events
// ============================================================
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Nav logo ─────────────────────────────────────────────────
document.getElementById('nav-logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  closeModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Hero CTA scroll ──────────────────────────────────────────
document.getElementById('hero-cta-explore').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('exploration').scrollIntoView({ behavior: 'smooth' });
});

// ── Char counter ─────────────────────────────────────────────
userStoryInput.addEventListener('input', () => {
  charCount.textContent = userStoryInput.value.length;
});

// ============================================================
//  ASSESSMENT — Reset state
// ============================================================
function resetAssessment() {
  assessFormWrapper.classList.remove('hidden');
  assessResultWrapper.classList.add('hidden');
  userStoryInput.value = '';
  charCount.textContent = '0';

  // Reset match circle
  matchProgressCircle.style.strokeDashoffset = '326.73';
  matchNumber.textContent = '0';
  matchLabelBadge.textContent = 'Memuat...';
  matchLabelBadge.className = 'match-label-badge';
}

// ============================================================
//  ASSESSMENT — Form Submit → /api/assess
// ============================================================
assessForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const story = userStoryInput.value.trim();
  if (story.length < 20) {
    showToast('Ceritain diri kamu lebih banyak dong! Minimal 20 karakter.', 'error');
    return;
  }

  setAssessLoading(true);

  try {
    const res = await fetch('/api/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        careerId:    currentCareer.id_role,
        careerTitle: currentCareer.title,
        userStory:   story,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');

    renderAssessResult(data);
  } catch (err) {
    showToast(err.message || 'Gagal terhubung ke server.', 'error');
  } finally {
    setAssessLoading(false);
  }
});

function setAssessLoading(isLoading) {
  const btn = document.getElementById('assess-btn');
  btn.disabled = isLoading;
  assessBtnText.classList.toggle('hidden', isLoading);
  assessBtnLoading.classList.toggle('hidden', !isLoading);
}

// ============================================================
//  RENDER Assessment Result
// ============================================================
function renderAssessResult(data) {
  assessFormWrapper.classList.add('hidden');
  assessResultWrapper.classList.remove('hidden');
  assessResultWrapper.scrollTop = 0;

  // ── Match Score Circle ────────────────────────────────────
  const score = Math.min(100, Math.max(0, data.match_score || 0));
  const circumference = 326.73;
  const offset = circumference - (score / 100) * circumference;

  // Animate the number and circle
  animateMatchScore(score, offset);

  // Match label
  matchCareerName.textContent = currentCareer.title;
  let labelText = 'Potensial';
  let labelClass = 'match-label-badge match-medium';
  if (score >= 75) { labelText = 'Sangat Cocok! 🔥'; labelClass = 'match-label-badge match-high'; }
  else if (score >= 50) { labelText = 'Cukup Cocok'; labelClass = 'match-label-badge match-medium'; }
  else { labelText = 'Perlu Banyak Belajar'; labelClass = 'match-label-badge match-low'; }
  matchLabelBadge.textContent = labelText;
  matchLabelBadge.className = labelClass;

  // ── Reality Check ─────────────────────────────────────────
  resRealityCheck.textContent = data.reality_check || '-';

  // ── Skill Gaps ────────────────────────────────────────────
  resSkillGaps.innerHTML = '';
  (data.skill_gaps || []).forEach((gap) => {
    const tag = document.createElement('span');
    tag.className = 'skill-gap-tag';
    tag.textContent = gap;
    resSkillGaps.appendChild(tag);
  });
  if ((data.skill_gaps || []).length === 0) {
    resSkillGaps.innerHTML = '<span class="skill-gap-tag skill-gap-ok">Profil kamu sudah cukup solid! 💪</span>';
  }

  // ── Action Plan 3 Months ──────────────────────────────────
  resActionPlan.innerHTML = '';
  const months = data.action_plan || [];
  months.forEach((month, idx) => {
    const el = document.createElement('div');
    el.className = 'action-month';
    el.innerHTML = `
      <div class="action-month-header">
        <span class="action-month-num">Bulan ${idx + 1}</span>
        <span class="action-month-focus">${month.focus || ''}</span>
      </div>
      <ul class="action-month-tasks">
        ${(month.tasks || []).map((t) => `<li>${t}</li>`).join('')}
      </ul>
    `;
    resActionPlan.appendChild(el);
  });

  // ── First Step ────────────────────────────────────────────
  resFirstStep.textContent = data.first_step || '-';

  // ── Certifications from DB ────────────────────────────────
  resCerts.innerHTML = currentCareer.certifications
    .map((c) => `<div class="cert-item"><span class="cert-icon">🏆</span><span class="cert-name">${c}</span></div>`)
    .join('');
}

// ── Smooth score animation ────────────────────────────────────
function animateMatchScore(targetScore, targetOffset) {
  const circumference = 326.73;
  let current = 0;
  const duration = 1200; // ms
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentScore = Math.round(eased * targetScore);
    const currentOffset = circumference - (currentScore / 100) * circumference;

    matchNumber.textContent = currentScore;
    matchProgressCircle.style.strokeDashoffset = currentOffset;

    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================================
//  Result Action Buttons
// ============================================================
btnReanalyze.addEventListener('click', () => {
  assessResultWrapper.classList.add('hidden');
  assessFormWrapper.classList.remove('hidden');
  userStoryInput.focus();
});

btnCloseModalResult.addEventListener('click', closeModal);

// ============================================================
//  TOAST NOTIFICATION
// ============================================================
function showToast(message, type = 'info') {
  toastMsg.textContent = message;
  toastEl.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 4000);
}

// ============================================================
//  INIT
// ============================================================
loadCareers();

// Re-render constellation on resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (allCareers.length === 0) return;
    const filtered = activeCategory === 'all'
      ? allCareers
      : allCareers.filter(c => c.category === activeCategory);
    renderConstellation(filtered);
  }, 250);
});

// Auto-hide hint after first interaction
svgEl.addEventListener('click', () => {
  const hint = document.getElementById('constellation-hint');
  if (hint) hint.style.opacity = '0';
}, { once: true });
