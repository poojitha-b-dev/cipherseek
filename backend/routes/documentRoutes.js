const express = require('express');
const multer = require('multer');
const { encryptDocument, decryptDocument } = require('../utils/crypto');
const connection = require('../config/db');
const jwt = require('jsonwebtoken');

// ✅ peks.js is at backend/peks.js, routes file is at backend/routes/documentRoutes.js
// So the correct relative path is '../peks'
const {
  PEKS,
  Trapdoor,
  Test,
  deriveUserKeyPair,
  serializeCiphertext,
  deserializeCiphertext,
} = require('../peks');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ─── JWT MIDDLEWARE ───────────────────────────────────────────────────────────
const authenticateUser = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

// ─── SAVE ─────────────────────────────────────────────────────────────────────
router.post('/save', authenticateUser, upload.single('document'), async (req, res) => {
  const { keyword, format } = req.body;

  if (!req.file || !keyword || !format) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  // Derive this user's PEKS key pair — deterministic per user
  const { publicKey, privateKey } = deriveUserKeyPair(
    process.env.PEKS_MASTER_SECRET,
    String(req.userId)
  );

  // ── DUPLICATE CHECK via PEKS Trapdoor + Test() ───────────────────────────
  // Generate trapdoor for incoming keyword, test against all stored ciphertexts
  try {
    const [existing] = await connection.promise().query(
      'SELECT id, peks_ciphertext FROM documents WHERE user_id = ? AND peks_ciphertext IS NOT NULL',
      [req.userId]
    );

    const trapdoor = Trapdoor(privateKey, keyword);

    for (const row of existing) {
      try {
        const ct = deserializeCiphertext(row.peks_ciphertext);
        if (Test(ct, trapdoor, privateKey)) {
          // ✅ Keyword already exists — block the save and return clear error
          return res.status(409).json({
            message: `A document with the keyword "${keyword}" already exists. Search for it instead, or use a different keyword.`,
          });
        }
      } catch {
        // Skip malformed rows
      }
    }
  } catch (err) {
    console.error('PEKS duplicate check error:', err);
    return res.status(500).json({ message: 'Error checking for duplicate keyword' });
  }

  // ── PEKS encrypt the keyword ──────────────────────────────────────────────
  const peksCiphertext = serializeCiphertext(PEKS(publicKey, keyword));

  // ── AES encrypt the keyword for storage ──────────────────────────────────
  const { encryptedData: encryptedKeyword, iv: keywordIV } = encryptDocument(keyword);

  // ── Encrypt / buffer the document body ───────────────────────────────────
  let documentData, docIV = null;
  if (format === 'text') {
    const text = req.file.buffer.toString('utf-8');
    const { encryptedData, iv } = encryptDocument(text);
    documentData = Buffer.from(encryptedData, 'hex');
    docIV = iv;
  } else {
    documentData = req.file.buffer;
  }

  // ── INSERT — always a new row ─────────────────────────────────────────────
  const sql = `
    INSERT INTO documents
      (user_id, keyword, keyword_iv, peks_ciphertext, document, iv, format)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await connection.promise().query(sql, [
      req.userId,
      encryptedKeyword,   // AES-encrypted keyword (for reference)
      keywordIV,
      peksCiphertext,     // ✅ PEKS ciphertext — this is what search uses
      documentData,
      docIV,
      format,
    ]);
    res.status(201).json({ message: 'Document saved', documentId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
});

// ─── SEARCH via PEKS Trapdoor + Test() ────────────────────────────────────────
router.post('/verify', authenticateUser, async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ message: 'Keyword is required' });

  // Derive this user's key pair
  const { privateKey } = deriveUserKeyPair(
    process.env.PEKS_MASTER_SECRET,
    String(req.userId)
  );

  // Generate trapdoor for the search keyword
  const trapdoor = Trapdoor(privateKey, keyword);

  try {
    // Fetch all docs for this user that have a PEKS ciphertext
    const [rows] = await connection.promise().query(
      'SELECT * FROM documents WHERE user_id = ? AND peks_ciphertext IS NOT NULL ORDER BY created_at DESC',
      [req.userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'No documents found for that keyword' });
    }

    // ✅ Run Test() on each row — pure PEKS search, no plaintext keyword used
    const matched = rows.filter((row) => {
      try {
        const ct = deserializeCiphertext(row.peks_ciphertext);
        return Test(ct, trapdoor, privateKey);
      } catch {
        return false;
      }
    });

    if (!matched.length) {
      return res.status(404).json({ message: 'No documents found for that keyword' });
    }

    // Decrypt document content for matched rows and return
    const documents = matched.map((doc, i) => {
      if (doc.format === 'text') {
        return {
          id: doc.id,
          number: i + 1,
          format: 'text',
          content: decryptDocument(doc.document.toString('hex'), doc.iv),
          created_at: doc.created_at,
        };
      } else {
        return {
          id: doc.id,
          number: i + 1,
          format: doc.format,
          content: doc.document.toString('base64'),
          created_at: doc.created_at,
        };
      }
    });

    return res.json({ found: documents.length, documents });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Search error' });
  }
});

// ─── LIST ─────────────────────────────────────────────────────────────────────
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

module.exports = router;