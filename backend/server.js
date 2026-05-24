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
// (Without this, all requests appear to come from the same proxy IP)
app.set('trust proxy', 1);

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// ── Health check ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PPSE API is running' });
});

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
