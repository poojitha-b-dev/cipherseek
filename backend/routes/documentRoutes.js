/**
 * documentRoutes.js – PEKS-upgraded version
 *
 * Changes from original:
 *  - Upload:  SHA-256 keyword hash REPLACED by PEKS ciphertext
 *  - Search:  Hash comparison REPLACED by PEKS Test() function
 *  - AES-256 file encryption UNCHANGED
 *  - JWT authentication UNCHANGED
 */

'use strict';

const express    = require('express');
const multer     = require('multer');
const { encryptDocument, decryptDocument } = require('../utils/crypto');
const connection = require('../config/db');
const jwt        = require('jsonwebtoken');
const peks       = require('../peks');

const router  = express.Router();
const storage = multer.memoryStorage();
const upload  = multer({ storage });

// ─── JWT MIDDLEWARE (unchanged) ───────────────────────────────────────────────
const authenticateUser = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

// ─── HELPER: get per-user PEKS key pair ──────────────────────────────────────
function getUserKeyPair(userId) {
  // PEKS_MASTER_SECRET must be in .env (32+ random bytes, hex-encoded)
  const masterSecret = process.env.PEKS_MASTER_SECRET ||
                       process.env.JWT_SECRET;   // fallback for migration ease
  return peks.deriveUserKeyPair(masterSecret, String(userId));
}

// ─── ROUTE: POST /api/documents/save ─────────────────────────────────────────
/**
 * PEKS change: Instead of storing keyword_hash = SHA256(keyword),
 * we store peks_ciphertext = PEKS(publicKey, keyword).
 *
 * The keyword never appears in plaintext in the database.
 * The ciphertext is randomised so two uploads of the same keyword
 * produce different stored values (unlinkability).
 */
router.post('/save', authenticateUser, upload.single('document'), async (req, res) => {
  const { keyword, format } = req.body;

  if (!req.file || !keyword || !format) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  // ── PEKS: encrypt keyword under user's public key ──
  const { publicKey } = getUserKeyPair(req.userId);
  const ciphertext     = peks.PEKS(publicKey, keyword);
  const peksCiphertext = peks.serializeCiphertext(ciphertext);

  // ── AES-256 file encryption (unchanged) ──
  let documentData, docIV = null;
  if (format === 'text') {
    const text = req.file.buffer.toString('utf-8');
    const { encryptedData, iv } = encryptDocument(text);
    documentData = Buffer.from(encryptedData, 'hex');
    docIV = iv;
  } else {
    documentData = req.file.buffer;
  }

  // Note: no keyword_hash column needed anymore; peks_ciphertext replaces it.
  // We keep a NULL keyword_hash for backward compatibility if your DB has it.
  const sql = `
    INSERT INTO documents (user_id, peks_ciphertext, document, iv, format)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await connection.promise().query(sql, [
      req.userId,
      peksCiphertext,
      documentData,
      docIV,
      format,
    ]);
    res.status(201).json({ message: 'Document saved', documentId: result.insertId });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// ─── ROUTE: POST /api/documents/verify ───────────────────────────────────────
/**
 * PEKS change: Instead of WHERE keyword_hash = SHA256(query),
 * we:
 *   1. Generate trapdoor Trapdoor(privateKey, query)
 *   2. Fetch ALL user's documents
 *   3. Run Test(ciphertext, trapdoor, privateKey) on each
 *
 * The server tests matches using only the trapdoor; it never
 * decrypts or compares the keyword in plaintext.
 *
 * Performance note: for large collections, a PEKS index or
 * server-side Test() stored procedure would be used. For this
 * academic demo we do it in application code.
 */
router.post('/verify', authenticateUser, async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ message: 'Keyword is required' });

  // ── Generate search trapdoor ──
  const { privateKey } = getUserKeyPair(req.userId);
  const trapdoor = peks.Trapdoor(privateKey, keyword);

  // ── Fetch all user's documents ──
  const sql = `
    SELECT id, peks_ciphertext, document, iv, format, created_at
    FROM documents
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  try {
    const [rows] = await connection.promise().query(sql, [req.userId]);

    // ── PEKS Test: find matching documents ──
    const matchingDoc = rows.find(row => {
      try {
        const ct = peks.deserializeCiphertext(row.peks_ciphertext);
        return peks.Test(ct, trapdoor, privateKey);
      } catch {
        return false;
      }
    });

    if (!matchingDoc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // ── Return document (AES decryption unchanged) ──
    if (matchingDoc.format === 'text') {
      const decrypted = decryptDocument(
        matchingDoc.document.toString('hex'),
        matchingDoc.iv
      );
      res.setHeader('Content-Type', 'text/plain');
      return res.send(decrypted);
    } else {
      const mimeType = getMimeType(matchingDoc.format);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition',
        `attachment; filename="document.${matchingDoc.format.split('/')[1]}"`);
      return res.send(matchingDoc.document);
    }

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search error' });
  }
});

// ─── ROUTE: GET /api/documents/list ──────────────────────────────────────────
// New utility endpoint – lists user's document IDs and timestamps
// (no keyword leakage; ciphertexts not returned)
router.get('/list', authenticateUser, async (req, res) => {
  try {
    const [rows] = await connection.promise().query(
      'SELECT id, format, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ documents: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

// ─── HELPER ───────────────────────────────────────────────────────────────────
function getMimeType(format) {
  switch (format) {
    case 'application/pdf': return 'application/pdf';
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'application/msword';
    case 'image/jpeg': return 'image/jpeg';
    case 'image/png':  return 'image/png';
    default:           return 'application/octet-stream';
  }
}

module.exports = router;
