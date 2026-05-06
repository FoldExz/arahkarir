'use strict';
require('dotenv').config();

// ============================================================
//  ARAH KARIR — Hybrid Career Platform Backend
//  Stack  : Node.js + Express + Google Gemini SDK
//  Arch   : Static JSON as Source of Truth + AI Evaluator
//  Security: Helmet, CORS, Rate-Limiting, Env-based API Key
// ============================================================

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const helmet   = require('helmet');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Environment validation ──────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('[FATAL] Environment variable GEMINI_API_KEY is not set. Exiting.');
  process.exit(1);
}

const PORT     = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'production';

// ── Load Careers Database (Source of Truth) ─────────────────
const DB_PATH  = path.join(__dirname, 'data', 'careers_db.json');
let careersDB  = [];

try {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  careersDB = JSON.parse(raw);
  console.log(`[INFO] Loaded ${careersDB.length} careers from careers_db.json`);
} catch (err) {
  console.error('[FATAL] Cannot read/parse data/careers_db.json:', err.message);
  process.exit(1);
}

// ── Gemini client ───────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.8,
  },
});

// ── Express app ─────────────────────────────────────────────
const app = express();

// ── Security Middlewares ─────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com',
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://roadmap.sh'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  })
);

app.use(
  cors({
    origin: NODE_ENV === 'development' ? '*' : false,
    methods: ['GET', 'POST'],
  })
);

// ── Rate Limiting ────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Coba lagi dalam 1 menit ya!' },
});

// ── Body Parser ──────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));

// ── Static Files (Frontend) ──────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
//  GET /api/careers — Serve the static careers database
// ============================================================
app.get('/api/careers', (req, res) => {
  return res.status(200).json(careersDB);
});

// ============================================================
//  SYSTEM PROMPT — Niche Specialization Analyzer
//  AI breaks a broad career into specific niches based on the
//  user's personal story, assigns "career currency", and
//  generates a branching Mermaid roadmap.
// ============================================================
const buildNichePrompt = (jobTarget, userProfile) => {
  return `
Kamu adalah "Arah", seorang Senior Career Coach AI yang jujur, blak-blakan, tapi selalu supportif dan berbasis data industri nyata.

TUGAS UTAMA:
User tertarik dengan bidang karir "${jobTarget}". Berdasarkan "curhatan" profil user di bawah, JANGAN bahas bidang ini secara umum. Sebaliknya, PECAH bidang ini menjadi 2-3 spesialisasi (niche) yang sangat spesifik, realistis sesuai kondisi industri Indonesia, dan paling relevan dengan kepribadian serta cerita user.

CONTOH LOGIKA NICHE:
- User bilang suka ngoding tapi males lapangan → rekomendasikan Network Automation Engineer (Ansible/Python), BUKAN Field Engineer
- User bilang suka nganalisis log & ancaman → rekomendasikan Security Analyst/SOC, BUKAN sekedar "Cybersecurity"
- User bilang suka data tapi benci statistik berat → rekomendasikan Data Analyst (Power BI/Looker), BUKAN Data Scientist

ATURAN "MATA UANG KARIR" (currency):
Setiap niche punya "mata uang" berbeda untuk tembus industri. Tentukan dengan jujur:
- Networking/Security → Sertifikasi (CCNA, NSE4, PCNSA, CEH)
- Cloud → Sertifikasi (AWS SAA, GCP ACE, AZ-104)
- Web Dev / Mobile → Portofolio GitHub / live project
- Data Analyst → Portofolio Kaggle + dashboard Looker/Power BI
- UI/UX → Portofolio Figma / Dribbble case study
- AI/ML → Paper/project di GitHub + Kaggle rank
- DevOps → Portofolio pipeline CI/CD di GitHub + sertifikasi CKA

ATURAN KETAT:
1. Kembalikan HANYA JSON valid mentah. DILARANG KERAS ada teks, komentar, atau markdown (seperti backtick atau kata "json") di luar struktur JSON.
2. Semua narasi dalam Bahasa Indonesia. Nama tools, teknologi, dan sertifikasi tetap dalam Bahasa Inggris.
3. "general_analysis": Tulis 2-3 kalimat analisis gaya savage/jujur tapi membangun tentang profil user menghadapi bidang "${jobTarget}" ini secara umum. Referensikan detail spesifik dari cerita user.
4. "top_niches": Array berisi tepat 2 atau 3 objek niche. Setiap objek wajib memiliki:
   - "niche_name": Nama spesialisasi yang sangat spesifik (contoh: "Network Automation Engineer - Ansible & Python", bukan "Network Engineer")
   - "why_it_fits": 1-2 kalimat kenapa niche ini cocok dengan cerita user secara spesifik
   - "currency": Mata uang utama untuk bisa dapat kerja di niche ini (jujur dan spesifik, contoh: "Sertifikasi NSE4 + PCNSA" atau "Portofolio 3 project GitHub dengan CI/CD")
   - "salary_range": Estimasi rentang gaji bulanan di Indonesia untuk niche ini (format: "Rp X juta - Y juta/bulan")
5. "roadmap_mermaid": String berisi kode Mermaid graph TD. ATURAN SANGAT KETAT:
   - Mulai PERSIS dengan: graph TD
   - ID node HANYA boleh huruf alfanumerik tanpa spasi (contoh: A, B, NodeC, Step1)
   - Semua label teks node WAJIB dibungkus kutip ganda (contoh: A["Mulai Belajar"])
   - Buat roadmap BERCABANG: dari fondasi dasar, bercabang ke masing-masing niche di top_niches
   - DILARANG KERAS menggunakan karakter khusus di dalam label selain tanda baca dasar
   - DILARANG menggunakan backtick atau kata "mermaid" sama sekali
6. "community_search_queries": Array 3-4 string kata kunci pencarian Google yang sangat spesifik untuk menemukan komunitas/grup online relevan dengan niche-niche yang direkomendasikan (contoh: "komunitas Network Automation Indonesia Telegram", "forum CCNA Indonesia Discord")

PROFIL USER:
"${userProfile}"

FORMAT JSON WAJIB (kembalikan HANYA JSON ini, tidak ada teks lain sama sekali):
{
  "general_analysis": "<string: 2-3 kalimat analisis jujur>",
  "top_niches": [
    {
      "niche_name": "<string: nama spesialisasi spesifik>",
      "why_it_fits": "<string: alasan cocok dengan cerita user>",
      "currency": "<string: mata uang karir untuk niche ini>",
      "salary_range": "<string: Rp X juta - Y juta/bulan>"
    }
  ],
  "roadmap_mermaid": "<string: kode mermaid graph TD bercabang, TANPA backtick>",
  "community_search_queries": ["<query 1>", "<query 2>", "<query 3>"]
}
`;
};

// ============================================================
//  SYSTEM PROMPT — Career Match Assessment
//  AI evaluates user's story against a specific career from DB
//  Returns: match_score, reality_check, skill_gaps, action_plan,
//           first_step
// ============================================================
const buildAssessPrompt = (career, userStory) => {
  const techStackStr  = career.tech_stack.join(', ');
  const certsStr      = career.certifications.join(', ');
  return `
Kamu adalah "Arah", Career Coach AI yang jujur, tajam, dan berbasis data nyata industri Indonesia.

TUGAS:
Evaluasi seberapa cocok user dengan profesi "${career.title}" berdasarkan cerita mereka.

DATA RESMI PROFESI INI (GUNAKAN SEBAGAI ACUAN EVALUASI):
- Kategori: ${career.category}
- Tech Stack yang dibutuhkan: ${techStackStr}
- Sertifikasi yang diakui industri: ${certsStr}
- Range gaji di Indonesia: ${career.salary_range_id}
- Demand level: ${career.demand_level}

CERITA USER:
"${userStory}"

ATURAN KETAT:
1. Kembalikan HANYA JSON valid mentah. DILARANG ada teks, markdown, atau backtick di luar JSON.
2. Semua narasi dalam Bahasa Indonesia. Nama tools dan sertifikasi tetap Bahasa Inggris.
3. "match_score": Angka integer 0-100. Evaluasi secara jujur berdasarkan kecocokan skill, kepribadian, dan latar belakang user dengan tech stack dan tuntutan profesi. Bukan sekadar motivasi.
4. "reality_check": 2-3 kalimat jujur tapi supportif tentang posisi user saat ini vs tuntutan nyata profesi ${career.title}. Referensikan detail spesifik dari cerita user.
5. "skill_gaps": Array 3-6 string nama skill/tools spesifik dari tech stack profesi yang belum dimiliki user (misal: "Docker", "React", "NSE4 Certification"). Kosongkan array jika user sudah solid.
6. "action_plan": Array tepat 3 objek, masing-masing mewakili satu bulan:
   - "focus": Judul fokus bulan tersebut (singkat, max 5 kata)
   - "tasks": Array 2-3 string tugas konkret dan actionable untuk bulan itu
7. "first_step": Satu kalimat actionable yang bisa user lakukan HARI INI untuk mulai perjalanan mereka.

FORMAT JSON WAJIB:
{
  "match_score": <integer 0-100>,
  "reality_check": "<string: 2-3 kalimat jujur>",
  "skill_gaps": ["<skill 1>", "<skill 2>"],
  "action_plan": [
    { "focus": "<judul bulan 1>", "tasks": ["<task 1>", "<task 2>"] },
    { "focus": "<judul bulan 2>", "tasks": ["<task 1>", "<task 2>"] },
    { "focus": "<judul bulan 3>", "tasks": ["<task 1>", "<task 2>"] }
  ],
  "first_step": "<string: satu langkah konkret hari ini>"
}
`;
};

// ============================================================
//  POST /api/analyze — AI Niche Specialization Analysis
// ============================================================
app.post('/api/analyze', apiLimiter, async (req, res) => {
  const { jobTarget, userProfile } = req.body;

  // ── Input Validation ──────────────────────────────────────
  if (!jobTarget || typeof jobTarget !== 'string' || jobTarget.trim().length < 2) {
    return res.status(400).json({ error: 'Field "jobTarget" wajib diisi.' });
  }
  if (!userProfile || typeof userProfile !== 'string') {
    return res.status(400).json({ error: 'Field "userProfile" wajib diisi.' });
  }

  const trimmedProfile = userProfile.trim();
  if (trimmedProfile.length < 20) {
    return res.status(400).json({ error: 'Ceritain diri kamu lebih banyak dong! Minimal 20 karakter ya.' });
  }
  if (trimmedProfile.length > 2000) {
    return res.status(400).json({ error: 'Terlalu panjang! Maksimal 2000 karakter ya.' });
  }

  // ── Build niche analysis prompt ───────────────────────────
  const fullPrompt = buildNichePrompt(jobTarget.trim(), trimmedProfile);

  try {
    const result       = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    // ── Parse & validate JSON response ───────────────────
    let parsed;
    try {
      const cleanText = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      parsed = JSON.parse(cleanText);
    } catch {
      console.error('[ERROR] Gemini response not valid JSON:', responseText.substring(0, 300));
      return res.status(502).json({
        error: 'AI lagi ngadat nih, responnya ga karuan. Coba lagi sebentar lagi!',
      });
    }

    // ── Validate required keys ────────────────────────────
    const requiredKeys = ['general_analysis', 'top_niches', 'roadmap_mermaid', 'community_search_queries'];
    const missingKeys  = requiredKeys.filter((k) => !(k in parsed));
    if (missingKeys.length > 0) {
      console.error('[ERROR] Missing keys from AI response:', missingKeys);
      return res.status(502).json({ error: 'Respons AI tidak lengkap. Coba lagi ya!' });
    }

    // ── Sanitize: ensure top_niches is an array ───────────
    if (!Array.isArray(parsed.top_niches)) {
      parsed.top_niches = [];
    }

    // ── Sanitize: ensure community_search_queries is array ─
    if (!Array.isArray(parsed.community_search_queries)) {
      parsed.community_search_queries = [];
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[ERROR] Gemini API call failed:', err.message || err);

    if (err.status === 429) {
      return res.status(429).json({ error: 'Quota Gemini API habis. Tunggu sebentar ya!' });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: 'Input kamu mungkin mengandung konten yang tidak bisa diproses.' });
    }

    return res.status(500).json({ error: 'Server lagi error. Coba lagi dalam beberapa detik.' });
  }
});

// ============================================================
//  POST /api/assess — AI Career Match Assessment (v2 HTML)
// ============================================================
app.post('/api/assess', apiLimiter, async (req, res) => {
  const { careerId, careerTitle, userStory } = req.body;

  // ── Input Validation ──────────────────────────────────────
  if (!careerId || typeof careerId !== 'string') {
    return res.status(400).json({ error: 'Field "careerId" wajib diisi.' });
  }
  if (!userStory || typeof userStory !== 'string') {
    return res.status(400).json({ error: 'Field "userStory" wajib diisi.' });
  }

  const trimmedStory = userStory.trim();
  if (trimmedStory.length < 20) {
    return res.status(400).json({ error: 'Ceritain diri kamu lebih banyak dong! Minimal 20 karakter ya.' });
  }
  if (trimmedStory.length > 2000) {
    return res.status(400).json({ error: 'Terlalu panjang! Maksimal 2000 karakter ya.' });
  }

  // ── Find career from DB ───────────────────────────────────
  const career = careersDB.find((c) => c.id_role === careerId);
  if (!career) {
    return res.status(404).json({ error: `Profesi dengan ID "${careerId}" tidak ditemukan di database.` });
  }

  const fullPrompt = buildAssessPrompt(career, trimmedStory);

  try {
    const result       = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    let parsed;
    try {
      const cleanText = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      parsed = JSON.parse(cleanText);
    } catch {
      console.error('[ERROR /api/assess] Gemini response not valid JSON:', responseText.substring(0, 300));
      return res.status(502).json({
        error: 'AI lagi ngadat nih, responnya ga karuan. Coba lagi sebentar lagi!',
      });
    }

    // ── Validate & sanitize ───────────────────────────────
    const requiredKeys = ['match_score', 'reality_check', 'skill_gaps', 'action_plan', 'first_step'];
    const missingKeys  = requiredKeys.filter((k) => !(k in parsed));
    if (missingKeys.length > 0) {
      console.error('[ERROR /api/assess] Missing keys:', missingKeys);
      return res.status(502).json({ error: 'Respons AI tidak lengkap. Coba lagi ya!' });
    }

    parsed.match_score = Math.min(100, Math.max(0, parseInt(parsed.match_score, 10) || 0));
    if (!Array.isArray(parsed.skill_gaps))    parsed.skill_gaps   = [];
    if (!Array.isArray(parsed.action_plan))   parsed.action_plan  = [];

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[ERROR /api/assess] Gemini API call failed:', err.message || err);
    if (err.status === 429) return res.status(429).json({ error: 'Quota Gemini API habis. Tunggu sebentar ya!' });
    if (err.status === 400) return res.status(400).json({ error: 'Input kamu mungkin mengandung konten yang tidak bisa diproses.' });
    return res.status(500).json({ error: 'Server lagi error. Coba lagi dalam beberapa detik.' });
  }
});

// ── SPA Fallback ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Arah Karir [Hybrid Platform] running on http://localhost:${PORT}`);
  console.log(`   Environment  : ${NODE_ENV}`);
  console.log(`   Gemini Model : gemini-2.5-flash`);
  console.log(`   Careers DB   : ${careersDB.length} roles loaded\n`);
});
