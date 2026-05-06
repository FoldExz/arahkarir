'use strict';

// ============================================================
//  ARAH KARIR — Frontend Script v3
//  Handles: Load careers from API, career detail modal (tabbed),
//           AI assessment with match score, mermaid roadmap
// ============================================================

// ── Mermaid Init ────────────────────────────────────────────
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#16161f',
    primaryColor: '#1c1c28',
    primaryBorderColor: '#7c6ff7',
    primaryTextColor: '#f0f0f8',
    lineColor: '#55556a',
    secondaryColor: '#1a1a26',
    tertiaryColor: '#16161f',
    edgeLabelBackground: '#16161f',
    clusterBkg: '#1a1a26',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    fontSize: '13px',
  },
  flowchart: { curve: 'basis', padding: 20 },
});

// ============================================================
//  STATE
// ============================================================
let currentCareer = null; // the full career object from DB

// ============================================================
//  DOM References
// ============================================================
const careersLoading  = document.getElementById('careers-loading');
const careersError    = document.getElementById('careers-error');
const careersGrid     = document.getElementById('careers-grid');

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
    const careers = await res.json();
    careersLoading.classList.add('hidden');
    renderCareers(careers);
  } catch (err) {
    console.error('[loadCareers] Error:', err);
    careersLoading.classList.add('hidden');
    careersError.classList.remove('hidden');
  }
}

// ============================================================
//  RENDER Career Cards
// ============================================================
function renderCareers(careers) {
  careersGrid.innerHTML = '';
  careers.forEach((career) => {
    const card = document.createElement('div');
    card.className = 'career-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Lihat detail profesi ${career.title}`);

    const demandClass = career.demand_level === 'Sangat Tinggi'
      ? 'demand-very-high'
      : career.demand_level === 'Tinggi' ? 'demand-high' : 'demand-medium';

    card.innerHTML = `
      <div class="career-card-top">
        <span class="career-emoji">${career.emoji}</span>
        <div class="career-category">${career.category}</div>
      </div>
      <h3 class="career-title">${career.title}</h3>
      <p class="career-desc">${career.description.slice(0, 120)}…</p>
      <div class="career-meta">
        <span class="career-salary">${career.salary_range_id}</span>
        <span class="career-demand ${demandClass}">${career.demand_level}</span>
      </div>
      <div class="career-stack-preview">
        ${career.tech_stack.slice(0, 4).map((t) => `<span class="stack-chip">${t}</span>`).join('')}
        ${career.tech_stack.length > 4 ? `<span class="stack-chip stack-more">+${career.tech_stack.length - 4}</span>` : ''}
      </div>
      <button class="career-cta-btn" aria-label="Buka detail ${career.title}">
        Lihat Detail & Cek Kecocokan
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    `;

    const openFn = () => openModal(career);
    card.querySelector('.career-cta-btn').addEventListener('click', openFn);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openFn(); });
    careersGrid.appendChild(card);
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
  modalRoadmapLink.href         = career.roadmap_url;

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
