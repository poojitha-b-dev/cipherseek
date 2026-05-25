// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Railway's reverse proxy so rate limiter sees real client IPs
app.set('trust proxy', 1);

// ── CORS ────────────────────────────────────────────────────────────
// List every frontend origin that is allowed to call this API.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',                 // local dev
  process.env.FRONTEND_URL,               // set this in Railway env vars
].filter(Boolean);                        // remove undefined if env var not set

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Allow any exact match from the list above
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // Allow ALL Vercel preview deployments automatically
    // (covers your-app-git-branch-name.vercel.app URLs)
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// ── Health check ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'CipherSeek API is running' });
});

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
