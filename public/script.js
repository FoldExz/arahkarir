'use strict';

// ============================================================
//  ARAH KARIR — Frontend Script
//  Handles: Category exploration, job cards, AI modal,
//           Mermaid rendering, community search buttons
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
//  DATA — Hardcoded Industry Categories & Jobs
// ============================================================
const INDUSTRY_DATA = [
  {
    id: 'tech',
    icon: '💻',
    name: 'Teknologi & Digital',
    desc: 'Software, data, cloud, AI, dan infrastruktur digital',
    jobs: [
      { emoji: '⚙️', name: 'Software Engineer', desc: 'Membangun aplikasi web, mobile, dan backend sistem skala besar.', tags: ['Coding', 'Problem Solving', 'Logika'] },
      { emoji: '📊', name: 'Data Scientist', desc: 'Menganalisis data besar untuk insight bisnis dan model prediktif.', tags: ['Python', 'Statistik', 'ML'] },
      { emoji: '🎨', name: 'UI/UX Designer', desc: 'Merancang pengalaman pengguna yang intuitif dan visual yang menarik.', tags: ['Figma', 'Research', 'Kreatif'] },
      { emoji: '☁️', name: 'Cloud Engineer', desc: 'Mengelola infrastruktur cloud (AWS/GCP/Azure) untuk perusahaan.', tags: ['DevOps', 'Linux', 'Networking'] },
      { emoji: '🔐', name: 'Cybersecurity Analyst', desc: 'Melindungi sistem dan data dari serangan siber dan ancaman digital.', tags: ['Security', 'Ethical Hacking', 'Analitis'] },
      { emoji: '📱', name: 'Mobile Developer', desc: 'Membangun aplikasi iOS dan Android yang digunakan jutaan orang.', tags: ['Flutter', 'React Native', 'Swift'] },
      { emoji: '🤖', name: 'AI/ML Engineer', desc: 'Membangun dan melatih model kecerdasan buatan untuk produk nyata.', tags: ['Deep Learning', 'Python', 'Math'] },
      { emoji: '🛠️', name: 'DevOps Engineer', desc: 'Menjembatani development dan operasional dengan pipeline CI/CD.', tags: ['Docker', 'Kubernetes', 'CI/CD'] },
    ],
  },
  {
    id: 'creative',
    icon: '🎨',
    name: 'Kreatif & Desain',
    desc: 'Visual, konten, branding, film, dan seni digital',
    jobs: [
      { emoji: '🖼️', name: 'Graphic Designer', desc: 'Membuat visual branding, poster, dan identitas visual perusahaan.', tags: ['Illustrator', 'Photoshop', 'Kreatif'] },
      { emoji: '🎬', name: 'Video Editor', desc: 'Menyunting video konten kreator, iklan, dan film pendek.', tags: ['Premiere', 'After Effects', 'Storytelling'] },
      { emoji: '📸', name: 'Fotografer / Videografer', desc: 'Mengabadikan momen komersial, fashion, dan jurnalistik secara profesional.', tags: ['Komposisi', 'Lightroom', 'Kreatif'] },
      { emoji: '✍️', name: 'Content Writer / Copywriter', desc: 'Menulis konten yang menarik untuk web, media sosial, dan iklan.', tags: ['SEO', 'Storytelling', 'Menulis'] },
      { emoji: '🎮', name: 'Game Designer', desc: 'Merancang mekanik, level, dan narasi dalam video game.', tags: ['Unity', 'Unreal', 'Gameplay Design'] },
      { emoji: '🎙️', name: 'Podcaster / Content Creator', desc: 'Membangun audiens dan monetisasi konten digital di berbagai platform.', tags: ['Personal Brand', 'Audio', 'Konsisten'] },
    ],
  },
  {
    id: 'business',
    icon: '📈',
    name: 'Bisnis & Manajemen',
    desc: 'Strategi, keuangan, operasional, dan kepemimpinan',
    jobs: [
      { emoji: '📣', name: 'Digital Marketing Specialist', desc: 'Mengelola kampanye iklan digital untuk pertumbuhan bisnis.', tags: ['Meta Ads', 'Google Ads', 'Analitik'] },
      { emoji: '💰', name: 'Financial Analyst', desc: 'Menganalisis data keuangan untuk keputusan investasi dan strategi bisnis.', tags: ['Excel', 'Akuntansi', 'Analitis'] },
      { emoji: '🤝', name: 'Product Manager', desc: 'Memimpin roadmap produk digital dari ide hingga rilis ke pasar.', tags: ['Strategy', 'Komunikasi', 'Data'] },
      { emoji: '📦', name: 'Supply Chain Manager', desc: 'Mengoptimalkan rantai pasok dari vendor hingga ke tangan konsumen.', tags: ['Logistik', 'Operasional', 'Analitis'] },
      { emoji: '🧑‍💼', name: 'HR & People Operations', desc: 'Rekrut, kembangkan, dan pertahankan talenta terbaik di perusahaan.', tags: ['Komunikasi', 'Empati', 'Organisasi'] },
      { emoji: '🌐', name: 'Business Development', desc: 'Mengembangkan kemitraan dan ekspansi bisnis ke pasar baru.', tags: ['Negosiasi', 'Networking', 'Strategi'] },
    ],
  },
  {
    id: 'health',
    icon: '🏥',
    name: 'Kesehatan & Sains',
    desc: 'Medis, penelitian, farmasi, dan biotek',
    jobs: [
      { emoji: '🩺', name: 'Dokter Umum / Spesialis', desc: 'Mendiagnosis dan merawat pasien di fasilitas kesehatan.', tags: ['Medis', 'Empati', 'Presisi'] },
      { emoji: '🧪', name: 'Peneliti / Scientist', desc: 'Melakukan riset ilmiah di laboratorium untuk inovasi dan penemuan baru.', tags: ['Riset', 'Statistik', 'Sabar'] },
      { emoji: '💊', name: 'Apoteker', desc: 'Mengelola dan memastikan keamanan penggunaan obat untuk pasien.', tags: ['Farmakologi', 'Detail', 'Komunikasi'] },
      { emoji: '🧬', name: 'Biomedical Engineer', desc: 'Merancang alat dan teknologi medis inovatif.', tags: ['Engineering', 'Biologi', 'Inovasi'] },
    ],
  },
  {
    id: 'education',
    icon: '📚',
    name: 'Pendidikan & Pelatihan',
    desc: 'Mengajar, melatih, dan mengembangkan kompetensi',
    jobs: [
      { emoji: '👨‍🏫', name: 'Guru / Dosen', desc: 'Mendidik generasi muda di sekolah atau perguruan tinggi.', tags: ['Komunikasi', 'Sabar', 'Kurikulum'] },
      { emoji: '🧑‍💻', name: 'Corporate Trainer', desc: 'Melatih karyawan perusahaan untuk meningkatkan skill profesional.', tags: ['Presentasi', 'Fasilitasi', 'Empati'] },
      { emoji: '🎓', name: 'E-Learning Developer', desc: 'Membuat konten kursus online interaktif untuk platform edukasi.', tags: ['Instructional Design', 'Video', 'LMS'] },
    ],
  },
  {
    id: 'legal',
    icon: '⚖️',
    name: 'Hukum & Konsultan',
    desc: 'Advokasi, konsultasi, dan kepatuhan regulasi',
    jobs: [
      { emoji: '👨‍⚖️', name: 'Pengacara / Advokat', desc: 'Mewakili klien dalam sengketa hukum dan memberikan nasihat legal.', tags: ['Analitis', 'Persuasif', 'Detail'] },
      { emoji: '📋', name: 'Legal Consultant', desc: 'Memberikan saran hukum kepada perusahaan untuk kepatuhan regulasi.', tags: ['Hukum Bisnis', 'Negosiasi', 'Riset'] },
      { emoji: '🔍', name: 'Compliance Officer', desc: 'Memastikan perusahaan beroperasi sesuai regulasi dan standar industri.', tags: ['Regulasi', 'Detail', 'Integritas'] },
    ],
  },
];

// ============================================================
//  STATE
// ============================================================
let currentJobTarget = '';
let currentJobEmoji = '💡';

// ============================================================
//  DOM References
// ============================================================
const phaseCategories = document.getElementById('phase-categories');
const phaseJobs = document.getElementById('phase-jobs');
const categoryGrid = document.getElementById('category-grid');
const jobsGrid = document.getElementById('jobs-grid');
const jobsBreadcrumb = document.getElementById('jobs-breadcrumb');
const jobsSectionTitle = document.getElementById('jobs-section-title');
const btnBackToCategories = document.getElementById('btn-back-to-categories');

const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalJobTitle = document.getElementById('modal-job-title');
const modalJobEmoji = document.getElementById('modal-job-emoji');
const modalBodyForm = document.getElementById('modal-body-form');
const modalBodyResult = document.getElementById('modal-body-result');

const analyzeForm = document.getElementById('analyze-form');
const userProfileInput = document.getElementById('user-profile-input');
const charCount = document.getElementById('char-count');
const analyzeBtnText = document.getElementById('analyze-btn-text');
const analyzeBtnLoading = document.getElementById('analyze-btn-loading');

const btnReanalyze = document.getElementById('btn-reanalyze');
const btnExploreMore = document.getElementById('btn-explore-more');
const toast = document.getElementById('toast');

// ============================================================
//  RENDER: Category Cards
// ============================================================
function renderCategories() {
  categoryGrid.innerHTML = '';
  INDUSTRY_DATA.forEach((industry) => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Eksplorasi karir di bidang ${industry.name}`);
    card.innerHTML = `
      <div class="category-card-inner">
        <span class="cat-icon">${industry.icon}</span>
        <div class="cat-name">${industry.name}</div>
        <div class="cat-desc">${industry.desc}</div>
        <span class="cat-count">${industry.jobs.length} jalur karir</span>
      </div>
    `;
    card.addEventListener('click', () => showJobs(industry));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') showJobs(industry); });
    categoryGrid.appendChild(card);
  });
}

// ============================================================
//  RENDER: Job Cards for a category
// ============================================================
function showJobs(industry) {
  jobsBreadcrumb.textContent = industry.name;
  jobsSectionTitle.textContent = `Pilih Jalur Karir di ${industry.name}`;

  jobsGrid.innerHTML = '';
  industry.jobs.forEach((job) => {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.innerHTML = `
      <div class="job-card-top">
        <span class="job-emoji">${job.emoji}</span>
        <div class="job-info">
          <div class="job-name">${job.name}</div>
          <div class="job-desc">${job.desc}</div>
        </div>
      </div>
      <div class="job-tags">
        ${job.tags.map((t) => `<span class="job-tag">${t}</span>`).join('')}
      </div>
      <button class="job-cta-btn" data-job="${job.name}" data-emoji="${job.emoji}" aria-label="Cek apakah ${job.name} cocok untuk saya">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Cocok Nggak Buat Gue?
      </button>
    `;
    card.querySelector('.job-cta-btn').addEventListener('click', () => openModal(job.name, job.emoji));
    jobsGrid.appendChild(card);
  });

  phaseCategories.classList.add('hidden');
  phaseJobs.classList.remove('hidden');
  phaseJobs.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
//  MODAL: Open & Close
// ============================================================
function openModal(jobName, emoji) {
  currentJobTarget = jobName;
  currentJobEmoji = emoji;
  modalJobTitle.textContent = jobName;
  modalJobEmoji.textContent = emoji;

  // Reset to form view
  modalBodyForm.classList.remove('hidden');
  modalBodyResult.classList.add('hidden');
  userProfileInput.value = '';
  charCount.textContent = '0';

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => userProfileInput.focus(), 300);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Nav logo goes back to categories ─────────────────────────
document.getElementById('nav-logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  backToCategories();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

btnBackToCategories.addEventListener('click', backToCategories);
function backToCategories() {
  phaseJobs.classList.add('hidden');
  phaseCategories.classList.remove('hidden');
  phaseCategories.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Hero CTA scroll ──────────────────────────────────────────
document.getElementById('hero-cta-explore').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('exploration').scrollIntoView({ behavior: 'smooth' });
});

// ── Char counter ─────────────────────────────────────────────
userProfileInput.addEventListener('input', () => {
  charCount.textContent = userProfileInput.value.length;
});

// ============================================================
//  MODAL RESULT: Reanalyze & Explore More
// ============================================================
btnReanalyze.addEventListener('click', () => {
  modalBodyResult.classList.add('hidden');
  modalBodyForm.classList.remove('hidden');
  userProfileInput.focus();
});

btnExploreMore.addEventListener('click', () => {
  closeModal();
});

// ============================================================
//  AI ANALYZE — Form Submit
// ============================================================
analyzeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const profile = userProfileInput.value.trim();
  if (profile.length < 20) {
    showToast('Ceritain diri kamu lebih banyak dong! Minimal 20 karakter.', 'error');
    return;
  }

  setAnalyzeLoading(true);

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTarget: currentJobTarget, userProfile: profile }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');

    renderResult(data);
  } catch (err) {
    showToast(err.message || 'Gagal terhubung ke server.', 'error');
  } finally {
    setAnalyzeLoading(false);
  }
});

function setAnalyzeLoading(isLoading) {
  const btn = document.getElementById('analyze-btn');
  btn.disabled = isLoading;
  analyzeBtnText.classList.toggle('hidden', isLoading);
  analyzeBtnLoading.classList.toggle('hidden', !isLoading);
}

// ============================================================
//  RENDER RESULT — v2 Niche Schema
// ============================================================
async function renderResult(data) {
  // Switch view
  modalBodyForm.classList.add('hidden');
  modalBodyResult.classList.remove('hidden');
  modalBodyResult.scrollTop = 0;

  // ── General Analysis ──────────────────────────────────────
  document.getElementById('res-general-analysis').textContent = data.general_analysis || '-';

  // ── Top Niches Cards ──────────────────────────────────────
  const nichesEl = document.getElementById('res-niches-container');
  nichesEl.innerHTML = '';
  const niches = data.top_niches || [];
  niches.forEach((niche, idx) => {
    const card = document.createElement('div');
    card.className = 'niche-card';
    card.style.animationDelay = `${idx * 0.1}s`;
    card.innerHTML = `
      <div class="niche-card-header">
        <span class="niche-index">${idx + 1}</span>
        <h4 class="niche-name">${niche.niche_name || '-'}</h4>
      </div>
      <div class="niche-field">
        <span class="niche-field-label">🎯 Kenapa Cocok</span>
        <p class="niche-field-value">${niche.why_it_fits || '-'}</p>
      </div>
      <div class="niche-field niche-field-currency">
        <span class="niche-field-label">💰 Mata Uang Karir</span>
        <p class="niche-field-value niche-currency-text">${niche.currency || '-'}</p>
      </div>
      <div class="niche-field niche-field-salary">
        <span class="niche-field-label">💸 Estimasi Gaji</span>
        <p class="niche-field-value niche-salary-text">${niche.salary_range || '-'}</p>
      </div>
    `;
    nichesEl.appendChild(card);
  });

  // ── Mermaid Roadmap ───────────────────────────────────────
  await renderMermaid(data.roadmap_mermaid || '');

  // ── Community Search Buttons ──────────────────────────────
  const communityEl = document.getElementById('res-community-buttons');
  communityEl.innerHTML = '';
  (data.community_search_queries || []).forEach((query) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'community-btn';
    a.innerHTML = `
      <span class="community-btn-icon">🔍</span>
      <span class="community-btn-text">${query}</span>
      <span class="community-btn-arrow">↗</span>
    `;
    communityEl.appendChild(a);
  });
}

// ============================================================
//  MERMAID RENDER — with sanitizer & graceful fallback
// ============================================================
async function renderMermaid(rawCode) {
  const container = document.getElementById('mermaid-diagram');
  container.innerHTML = '<p style="color:#55556a;font-size:12px;padding:8px;">⏳ Membuat roadmap visual...</p>';

  // ── 1. Sanitize: strip markdown fences & BOM chars ────────
  let clean = (rawCode || '')
    .replace(/\uFEFF/g, '')              // strip BOM
    .replace(/```mermaid\n?/gi, '')      // strip ```mermaid
    .replace(/```/g, '')                 // strip closing fence
    .trim();

  // ── 2. Ensure it starts with a valid graph declaration ────
  if (!clean.startsWith('graph') && !clean.startsWith('flowchart')) {
    clean = 'graph TD\n' + clean;
  }

  // ── 3. Fallback if still empty ────────────────────────────
  if (clean.length < 10) {
    clean = 'graph TD\n  A["Mulai Belajar"] --> B["Kuasai Tools"] --> C["Siap Kerja"]';
  }

  // ── 4. Try to render, show raw text if Mermaid still fails ─
  try {
    // Use unique ID each render to avoid Mermaid caching issues
    const renderId = 'mermaid-svg-' + Date.now();
    const { svg } = await mermaid.render(renderId, clean);
    container.innerHTML = svg;
  } catch (err) {
    console.error('[Mermaid] Render error:', err.message);
    container.innerHTML = `
      <div style="padding:16px;border:1px solid rgba(251,146,60,0.3);border-radius:8px;">
        <p style="color:#fdba74;font-size:13px;margin-bottom:12px;">⚠️ Format roadmap dari AI agak aneh. Coba analisis ulang ya, bro!</p>
        <details style="cursor:pointer;">
          <summary style="font-size:11px;color:#55556a;">Lihat teks roadmap mentah</summary>
          <pre style="text-align:left;font-size:11px;color:#8888aa;margin-top:10px;white-space:pre-wrap;word-break:break-all;">${clean}</pre>
        </details>
      </div>
    `;
  }
}

// ============================================================
//  TOAST NOTIFICATION
// ============================================================
function showToast(message, type = 'info') {
  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  toastMsg.textContent = message;
  toastEl.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 4000);
}

// ============================================================
//  INIT
// ============================================================
renderCategories();
