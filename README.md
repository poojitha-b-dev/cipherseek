# 🔐 PPSE – Privacy-Preserving Searchable Encryption System

PPSE is a full-stack web application that allows users to securely upload, store, and search
documents using **Public-Key Encryption with Keyword Search (PEKS)**. The system ensures
complete data confidentiality — even the server administrator cannot read documents or
discover what keywords users are searching for.

---

## 👩‍💻 Developer

**Banoth Poojitha** 
**College:** Bhoj Reddy Engineering College for Women
**Department:** Information Technology · AY 2025-26
**Guide:** B. Anitha | **HOD:** Dr. M. Sandhya Rani
**GitHub:** https://github.com/Letitbe098/ppse-project

---

## 🚀 Features

- 🔑 User Registration & Login with JWT Authentication
- 🔒 Password hashing with bcrypt (salt rounds = 10)
- 📁 Document encryption using AES-256-CBC before storage
- 🔍 Privacy-Preserving Keyword Search using PEKS scheme
- 🧩 Trapdoor-based secure keyword matching
- 🧠 Unlinkability — same keyword produces different ciphertext every time
- 🛡️ No plaintext keyword ever stored in the database
- 🚫 Duplicate keyword detection using PEKS Test() — blocks re-upload with same keyword
- 🌙 Dark/Light theme toggle
- 📥 Binary file download support (PDF, images)

---

## 🏗️ Architecture – MVC

| Layer | Technology | Role |
|---|---|---|
| Model | MySQL | Stores encrypted documents and PEKS ciphertexts |
| View | React.js | Frontend UI for all user interactions |
| Controller | Node.js + Express.js | Handles encryption, PEKS logic, routing |

---

## 🛠️ Full Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React.js | UI framework — all pages and components |
| Vite | Development server and build tool |
| React Context API | Global state — AuthContext (user/token) and ThemeContext (dark/light) |
| React Hooks | useState, useEffect, useRef, useCallback used throughout |
| Fetch API | HTTP requests to backend (via authFetch wrapper) |
| localStorage | Persisting JWT token and user info across sessions |
| CSS (custom) | Styling — index.css with custom classes |

### Backend
| Technology | Purpose |
|---|---|
| Node.js | Server-side JavaScript runtime |
| Express.js | REST API framework |
| Multer | File upload middleware (memoryStorage — files held in RAM) |
| CORS | Cross-Origin Resource Sharing (allows localhost:5173) |
| dotenv | Environment variable management (.env file) |

### Database
| Technology | Purpose |
|---|---|
| MySQL | Relational database — stores all encrypted data |
| mysql2 | Node.js MySQL driver (used with .promise() for async queries) |
| phpMyAdmin | Database management UI (used during development) |

### Security & Cryptography
| Algorithm | Library | Used For |
|---|---|---|
| AES-256-CBC | Node.js built-in `crypto` | Encrypting document content before storage |
| PEKS (ECDH-based) | Node.js built-in `crypto` | Keyword encryption and privacy-preserving search |
| secp256k1 | Node.js built-in `crypto` | Elliptic curve for PEKS key pair generation |
| ECDH | Node.js built-in `crypto` | Shared secret derivation inside PEKS |
| HMAC-SHA256 | Node.js built-in `crypto` | Trapdoor generation and tag verification in PEKS |
| SHA-256 | Node.js built-in `crypto` | H1/H2 hash functions inside PEKS construction |
| bcrypt | `bcryptjs` | Password hashing on register; comparison on login |
| JWT | `jsonwebtoken` | User session tokens (1 hour expiry) |

### npm Packages

**Backend:**
```
express
bcryptjs
jsonwebtoken
multer
mysql2
cors
dotenv
```

**Frontend:**
```
react
react-dom
vite
```

### Tools
| Tool | Purpose |
|---|---|
| Git & GitHub | Version control and code hosting |
| Postman | API testing |
| VS Code | Code editor |
| phpMyAdmin | Database UI during development |

---

## 🔐 Security Design

| Component | Method | Purpose |
|---|---|---|
| Document content | AES-256-CBC | Data confidentiality |
| Keyword | PEKS (ECDH, secp256k1) | Keyword encryption for secure search |
| Search | Trapdoor + Test() | Privacy-preserving matching |
| Password | bcrypt (rounds=10) | Secure password storage |
| Session | JWT (1hr expiry) | Access control |
| Duplicate check | PEKS Test() | Prevent same keyword re-upload |

---

## ⚙️ How It Works – Step by Step

### 1. User Authentication
- Register: password → bcrypt hash → stored in MySQL
- Login: bcrypt.compare() → if match → JWT token issued → stored in localStorage
- Every API request sends JWT in `Authorization: Bearer <token>` header
- Backend `authenticateUser` middleware verifies token before any operation

### 2. Document Upload (Encrypt & Store)

**Step 1 — Derive PEKS Key Pair**
```
deriveUserKeyPair(PEKS_MASTER_SECRET, userId)
→ { publicKey, privateKey }
```
Each user gets a unique EC key pair on secp256k1, derived deterministically
from a master secret + user ID. No need to store keys in the database.

**Step 2 — Duplicate Keyword Check**
```
Trapdoor(privateKey, keyword) → { td, h1w }
Test(storedCiphertext, trapdoor, privateKey) → true/false
```
Fetches all existing PEKS ciphertexts for this user and runs Test() on each.
If any match → returns 409 error: "keyword already exists."
This happens without ever decrypting or revealing any keyword.

**Step 3 — PEKS Encrypt the Keyword**
```
PEKS(publicKey, keyword) → { A, B, tag }
```
Stored as JSON in `peks_ciphertext` column. Each save produces a **different**
ciphertext even for the same keyword (randomised ephemeral key r each time).

**Step 4 — AES-256-CBC Encrypt the Document**
```
encryptDocument(text) → { encryptedData, iv }
```
Document content encrypted before storage. Random IV each time.

**Step 5 — Store in MySQL**
```sql
INSERT INTO documents (user_id, keyword, keyword_iv, peks_ciphertext, document, iv, format)
```

### 3. Privacy-Preserving Search

**Step 1 — Generate Trapdoor**
```
Trapdoor(privateKey, keyword) → { td, h1w }
```
A cryptographic token representing the keyword without revealing it.

**Step 2 — Run Test() on Every Stored Ciphertext**
```
Test({ A, B, tag }, { td, h1w }, privateKey) → true/false
```
Server runs Test() on each document's PEKS ciphertext. Only learns match/no-match.
Never sees the actual keyword.

**Step 3 — Decrypt Matched Documents**
```
decryptDocument(encryptedHex, iv) → plaintext
```
Only matched documents are AES-decrypted and returned to the user.

### 4. PEKS Mathematical Construction

```
PEKS(pk, w):
  r      = random EC key pair (ephemeral)
  A      = g^r  (ephemeral public key)
  shared = ECDH(r, pk) = pk^r = g^(sk·r)
  h1w    = H1(w) = SHA256("PEKS:H1:" + w)
  B      = H2(shared) XOR h1w
  tag    = HMAC_{h1w}(A || B)
  return { A, B, tag }

Trapdoor(sk, w):
  h1w = H1(w)
  td  = HMAC_{sk}("trapdoor:" || h1w)
  return { td, h1w }

Test({ A, B, tag }, { h1w }, sk):
  shared' = ECDH(sk, A) = A^sk = g^(r·sk)  ← same shared secret!
  B'      = H2(shared') XOR h1w
  return  B' == B  AND  HMAC_{h1w}(A||B) == tag
```

Why it works: `ECDH(r, pk) = g^(r·sk) = ECDH(sk, A)` — both sides compute
the same shared secret, so B' reconstructs correctly only when keyword matches.

---

## 🗄️ Database Schema

```sql
-- Users table
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,       -- bcrypt hash
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  keyword          TEXT,                      -- AES-encrypted keyword (reference)
  keyword_iv       VARCHAR(64),               -- AES IV for keyword
  peks_ciphertext  TEXT,                      -- JSON: {A, B, tag} — PEKS encrypted keyword
  document         LONGBLOB,                  -- AES-256 encrypted file content
  iv               VARCHAR(64),               -- AES IV for document
  format           VARCHAR(100) NOT NULL,     -- text / pdf / image mime type
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 📁 Project Structure

```
PPSE System
├─ backend
│  ├─ config
│  │  └─ db.js                  MySQL connection (mysql2, host 127.0.0.1:3306)
│  ├─ middleware
│  │  └─ authMiddleware.js      JWT verification middleware
│  ├─ routes
│  │  ├─ authRoutes.js          Register & Login (bcrypt + JWT)
│  │  └─ documentRoutes.js      Save, Search, List documents (PEKS + AES)
│  ├─ utils
│  │  └─ crypto.js              AES-256-CBC encrypt/decrypt functions
│  ├─ peks.js                   Full PEKS implementation (KeyGen, PEKS, Trapdoor, Test)
│  ├─ server.js                 Express entry point
│  ├─ test_peks.js              Unit tests for all PEKS primitives
│  └─ package.json
├─ frontend
│  └─ src
│     ├─ context
│     │  ├─ AuthContext.jsx     Global auth state (user, token, login, logout, authFetch)
│     │  └─ ThemeContext.jsx    Dark/light theme state
│     ├─ components
│     │  └─ Navbar.jsx          Navigation bar with theme toggle and logout
│     ├─ pages
│     │  ├─ Login.jsx           Login page
│     │  ├─ Register.jsx        Register page
│     │  ├─ Dashboard.jsx       Home dashboard with workflow overview
│     │  ├─ Upload.jsx          Encrypt & Store page (text + file upload)
│     │  ├─ Search.jsx          Search page (PEKS trapdoor search)
│     │  └─ About.jsx           Project info, team, and system modules
│     ├─ App.jsx                Root component with page routing
│     └─ index.css              Custom CSS styles
├─ migrate_peks.sql             DB migration — adds peks_ciphertext column
└─ README.md
```

---

## 🌐 How to Run Locally

### Prerequisites
- Node.js v18+
- MySQL running locally
- Create database: `CREATE DATABASE secure_docs;`

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=secure_docs
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_64_char_hex_key_here
PEKS_MASTER_SECRET=your_peks_master_secret_here
```

Run database migration:
```bash
mysql -u root -p secure_docs < migrate_peks.sql
```

Start server:
```bash
node server.js
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`
Backend runs at: `http://localhost:5000`

### 3. Run PEKS Unit Tests

```bash
cd backend
node test_peks.js
```

Tests verify: KeyGen, PEKS randomisation, Trapdoor determinism,
Test() true positives, Test() true negatives, user key isolation,
deriveUserKeyPair determinism, and serialisation round-trip.

---

## ⚠️ Note

This system implements a **PEKS-inspired scheme using Elliptic Curve Diffie-Hellman (ECDH)**
on the secp256k1 curve via Node.js's built-in `crypto` module. A full bilinear
pairing-based PEKS (as in the original BDOP 2004 paper) is not implemented due to
the absence of pairing-friendly curves in Node.js natively. This ECDH construction
preserves all four PEKS API functions (KeyGen, PEKS, Trapdoor, Test) and the core
security properties for academic use.

---

## 📌 Summary

| What | How |
|---|---|
| Documents | Encrypted with AES-256-CBC before storage |
| Keywords | Encrypted with PEKS (ECDH, secp256k1) |
| Search | Performed using cryptographic trapdoors — server never sees keyword |
| Passwords | Hashed with bcrypt (salt rounds = 10) |
| Sessions | Managed with JWT tokens (1hr expiry) |
| No sensitive data exposed | ✅ |

---

## 👨‍💻 Author / GitHub

- **B.Poojitha** 
- **GitHub:** https://github.com/Letitbe098/ppse-project