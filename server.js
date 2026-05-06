'use strict';
require('dotenv').config();

// ============================================================
//  ARAH KARIR — Backend Server
//  Stack: Node.js + Express + Google Gemini SDK
//  Security: Helmet, CORS, Rate-Limiting, Env-based API Key
// ============================================================

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Environment validation ──────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('[FATAL] Environment variable GEMINI_API_KEY is not set. Exiting.');
  process.exit(1);
}

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'production';

// ── Gemini client ───────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.75,
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
          "'unsafe-inline'", // needed for Mermaid.js inline execution
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
        imgSrc: ["'self'", 'data:', 'blob:'],
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

// ── Rate Limiting: Protect /api/* endpoints ──────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 8,              // max 8 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak request. Coba lagi dalam 1 menit ya!',
  },
});

// ── Body Parser ──────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));

// ── Static Files (Frontend) ──────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
//  SYSTEM PROMPT — Arah Karir AI Career Analyzer (v2 — Niche)
// ============================================================
const buildAnalysisPrompt = (jobTarget, userProfile) => {
  // Mermaid rules spelled out without backtick fences to avoid JS template literal conflicts
  const mermaidRules = [
    'ATURAN SANGAT KETAT UNTUK MERMAID - WAJIB DIIKUTI:',
    'a. JANGAN gunakan markdown code fence (backtick mermaid). Kembalikan teks murni saja.',
    'b. ID Node HARUS berupa huruf saja tanpa spasi (contoh: A, B, C, NodeA, NicheA).',
    'c. Teks di dalam node WAJIB dibungkus dengan tanda kutip ganda.',
    '   Contoh BENAR: A["Belajar Dasar"] --> B["Tools Utama"]',
    '   Contoh SALAH : A[Belajar Dasar] --> B[Tools Utama]',
    'd. JANGAN gunakan karakter: tanda kurung (), kurung siku [], garis miring /, tanda bintang * di DALAM teks label.',
    'e. Selalu mulai dengan baris pertama: graph TD',
    'f. Minimal 12 node. Bercabang dari pondasi menuju TIAP niche yang ada di top_niches.',
  ].join('\n   ');

  return `
Kamu adalah "Arah", seorang Senior Career Strategist AI, ahli pasar kerja Indonesia yang blak-blakan dan sangat spesifik.

TUGAS UTAMA:
User memilih bidang karir "${jobTarget}". Jangan analisis secara umum.
Bedah profil user, lalu rekomendasikan 2-3 SPESIALISASI (niche) paling spesifik dan realistis di dalam bidang tersebut yang paling sesuai dengan karakter dan latarbelakang user.

ATURAN KETAT:
1. Kembalikan HANYA JSON valid, TANPA teks atau markdown di luar JSON.
2. Semua teks menggunakan Bahasa Indonesia, kecuali nama tools/sertifikasi/teknologi.
3. "general_analysis": Analisis jujur, sedikit savage tapi supportif, tentang profil user di bidang ini secara umum. Max 3 kalimat.
4. "top_niches": Array berisi 2-3 objek spesialisasi. Setiap niche HARUS:
   - "niche_name": Nama spesifik, sertakan tools/vendor utama (contoh: "Network Automation Engineer - Ansible dan Python").
   - "why_it_fits": Jelaskan MENGAPA cocok dengan curhatan user, referensikan trait spesifik yang user sebutkan.
   - "currency": Mata uang karir ini — apa yang WAJIB dimiliki untuk dapat kerja (contoh: "Sertifikasi CCNA + portofolio lab GNS3" atau "Portofolio GitHub aktif + kontribusi open source").
   - "salary_range": Estimasi gaji realistis di Indonesia untuk niche ini (format Rupiah, range junior-senior).
5. "roadmap_mermaid": ${mermaidRules}
6. "community_search_queries": 3 kata kunci pencarian Google yang spesifik untuk komunitas (Telegram/Discord/LinkedIn) di Indonesia terkait bidang ini.

PROFIL PENGGUNA:
"${userProfile}"

FORMAT JSON WAJIB (kembalikan HANYA JSON ini, tidak ada teks lain):
{
  "general_analysis": "<string: analisis jujur 3 kalimat>",
  "top_niches": [
    {
      "niche_name": "<string: nama spesialisasi spesifik>",
      "why_it_fits": "<string: alasan cocok dengan profil user>",
      "currency": "<string: sertifikasi/portofolio/skill wajib>",
      "salary_range": "<string: rentang gaji di Indonesia>"
    }
  ],
  "roadmap_mermaid": "graph TD\\n  A[\\"Pondasi Awal\\"] --> B[\\"Skill Inti\\"]\\n  B --> C[\\"Niche A\\"] & D[\\"Niche B\\"]",
  "community_search_queries": ["<query 1>", "<query 2>", "<query 3>"]
}
`;
};

// ============================================================
//  POST /api/analyze — Career Match Analysis Endpoint
// ============================================================
app.post('/api/analyze', apiLimiter, async (req, res) => {
  const { jobTarget, userProfile } = req.body;

  // ── Input Validation ────────────────────────────────────
  if (!jobTarget || typeof jobTarget !== 'string') {
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

  const trimmedJob = jobTarget.trim().substring(0, 100);

  // ── Build & send prompt ──────────────────────────────────
  const fullPrompt = buildAnalysisPrompt(trimmedJob, trimmedProfile);

  try {
    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    // ── Parse & validate JSON response ───────────────────
    let parsed;
    try {
      const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch {
      console.error('[ERROR] Gemini response not valid JSON:', responseText.substring(0, 300));
      return res.status(502).json({
        error: 'AI lagi ngadat nih, responnya ga karuan. Coba lagi sebentar lagi!',
      });
    }

    // ── Validate required keys ────────────────────────────
    const requiredKeys = ['general_analysis', 'top_niches', 'roadmap_mermaid', 'community_search_queries'];
    const missingKeys = requiredKeys.filter((k) => !(k in parsed));
    if (missingKeys.length > 0) {
      console.error('[ERROR] Missing keys:', missingKeys);
      return res.status(502).json({ error: 'Respons AI tidak lengkap. Coba lagi ya!' });
    }

    // ── Validate top_niches is a non-empty array ──────────
    if (!Array.isArray(parsed.top_niches) || parsed.top_niches.length === 0) {
      console.error('[ERROR] top_niches is empty or not an array');
      return res.status(502).json({ error: 'Respons AI tidak valid. Coba lagi ya!' });
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

// ── SPA Fallback: serve index.html for all other GET routes ─
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Arah Karir server running on http://localhost:${PORT}`);
  console.log(`   Environment : ${NODE_ENV}`);
  console.log(`   Gemini Model: gemini-2.5-flash\n`);
});
