# 🔐 PPSE – Privacy-Preserving Searchable Encryption System

PPSE is a full-stack web application that enables users to securely upload, encrypt, store, and search documents using a Privacy-Preserving Encryption with Keyword Search (PEKS) scheme.

The system ensures:
- Secure encrypted document storage
- Privacy-preserving keyword search
- Trapdoor-based matching
- Secure authentication
- End-to-end confidentiality

---

# 🌐 Live Deployment

## Frontend
Deployed on Netlify

## Backend
Deployed on Railway

## Automatic Deployment
GitHub is connected to both Netlify and Railway.

Every push to the `main` branch automatically redeploys the application.

---

# 👩‍💻 Developer

**Banoth Poojitha**

GitHub:  
https://github.com/Letitbe098/ppse-project

---

# 🚀 Features

- JWT Authentication
- Secure User Registration & Login
- AES-256-CBC Document Encryption
- PEKS-Based Secure Keyword Search
- Trapdoor-Based Matching
- Duplicate Keyword Detection
- Secure File Uploads
- Responsive UI
- Dark / Light Theme Toggle
- Binary File Download Support

---

# 🏗️ System Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js + Vite | User Interface |
| Backend | Node.js + Express.js | API & Encryption Logic |
| Database | MySQL | Encrypted Data Storage |
| Security | AES + PEKS + JWT | Privacy & Authentication |

---

# 🛠️ Technology Stack

## Frontend
- React.js
- Vite
- React Context API
- Fetch API
- Custom CSS

## Backend
- Node.js
- Express.js
- Multer
- dotenv
- CORS

## Database
- MySQL
- mysql2

## Security & Cryptography
- AES-256-CBC
- ECDH-based PEKS
- secp256k1
- SHA-256
- HMAC-SHA256
- bcryptjs
- JWT

---

# 🔐 Security Design

| Component | Method |
|---|---|
| Document Encryption | AES-256-CBC |
| Keyword Encryption | PEKS |
| Secure Search | Trapdoor + Test() |
| Password Security | bcrypt |
| Session Handling | JWT |
| Duplicate Detection | PEKS Test() |

---

# ⚙️ How the System Works

## Document Upload
1. User uploads document
2. Document encrypted using AES-256-CBC
3. Keyword encrypted using PEKS
4. Encrypted data stored in MySQL

## Secure Search
1. User enters keyword
2. Trapdoor generated
3. PEKS Test() runs against encrypted keywords
4. Matching encrypted documents returned
5. Documents decrypted before display

---

# 🔬 PEKS Construction

```txt
PEKS(pk, w):
  r      = random EC key pair
  A      = g^r
  shared = ECDH(r, pk)

  h1w    = SHA256(w)
  B      = H2(shared) XOR h1w
  tag    = HMAC(h1w, A || B)

Trapdoor(sk, w):
  h1w = SHA256(w)
  td  = HMAC(sk, h1w)

Test():
  reconstruct shared secret
  verify ciphertext integrity
```

---

# 📁 Project Structure

```
PPSE System
├─ backend
│  ├─ config
│  │  └─ db.js
│  ├─ crypt.js
│  ├─ jwt.js
│  ├─ middleware
│  │  └─ authMiddleware.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ peks.js
│  ├─ routes
│  │  ├─ authRoutes.js
│  │  └─ documentRoutes.js
│  ├─ server.js
│  ├─ test_peks.js
│  └─ utils
│     └─ crypto.js
├─ frontend
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ vite.svg
│  │  └─ _redirects
│  ├─ src
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  └─ hero-bg.png
│  │  ├─ components
│  │  │  └─ Navbar.jsx
│  │  ├─ context
│  │  │  ├─ AuthContext.jsx
│  │  │  └─ ThemeContext.jsx
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  └─ pages
│  │     ├─ About.jsx
│  │     ├─ Dashboard.jsx
│  │     ├─ document.json
│  │     ├─ Login.jsx
│  │     ├─ Register.jsx
│  │     ├─ Search.jsx
│  │     └─ Upload.jsx
│  └─ vite.config.js
├─ migrate_peks.sql
└─ README.md

```

---

# 🌍 Local Development Setup

## Prerequisites

- Node.js v18+
- MySQL
- Git

---

# Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=secure_docs

JWT_SECRET=your_secret
ENCRYPTION_KEY=your_encryption_key
PEKS_MASTER_SECRET=your_peks_secret
```

Run backend:

```bash
node server.js
```

Backend runs on:

```txt
http://localhost:5000
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env`

```env
VITE_API_URL=http://localhost:5000
```

Frontend runs on:

```txt
http://localhost:5173
```

---

# 🚀 Production Deployment

## Frontend Deployment
- Hosted using Netlify
- SPA routing handled using `_redirects`

`frontend/public/_redirects`

```txt
/* /index.html 200
```

## Backend Deployment
- Hosted using Railway

## Production Environment Variables

Netlify frontend uses the deployed Railway backend URL through environment variables.

---

# 📱 Responsive Design

The application UI is optimized for:
- Desktop
- Tablet
- Mobile Devices

Responsive improvements include:
- Flexible layouts
- Mobile navigation
- Adaptive containers
- Overflow handling

---

# 🧪 Testing

Run PEKS unit tests:

```bash
cd backend
node test_peks.js
```

---

# ⚠️ Technical Note

This project implements a PEKS-inspired scheme using Elliptic Curve Diffie-Hellman (ECDH) with the secp256k1 curve through Node.js's built-in `crypto` module.

The implementation preserves:
- KeyGen
- PEKS
- Trapdoor
- Test()

while maintaining privacy-preserving searchable encryption properties suitable for secure document search workflows.

---

# 📌 Summary

| Feature | Status |
|---|---|
| AES Document Encryption | ✅ |
| PEKS Keyword Search | ✅ |
| JWT Authentication | ✅ |
| Secure File Uploads | ✅ |
| Duplicate Detection | ✅ |
| Responsive UI | ✅ |
| Railway Deployment | ✅ |
| Netlify Deployment | ✅ |

---

# 👨‍💻 Author

**Banoth Poojitha**

GitHub:  
https://github.com/Letitbe098/ppse-project
```
PPSE System
├─ backend
│  ├─ config
│  │  └─ db.js
│  ├─ crypt.js
│  ├─ jwt.js
│  ├─ middleware
│  │  ├─ authMiddleware.js
│  │  └─ rateLimiter.js
│  ├─ migrations
│  │  └─ 002_auth_upgrade.sql
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ peks.js
│  ├─ routes
│  │  ├─ authRoutes.js
│  │  └─ documentRoutes.js
│  ├─ server.js
│  ├─ test_peks.js
│  └─ utils
│     ├─ crypto.js
│     └─ mailer.js
├─ frontend
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ vite.svg
│  │  └─ _redirects
│  ├─ src
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  └─ hero-bg.png
│  │  ├─ components
│  │  │  └─ Navbar.jsx
│  │  ├─ context
│  │  │  ├─ AuthContext.jsx
│  │  │  └─ ThemeContext.jsx
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  └─ pages
│  │     ├─ About.jsx
│  │     ├─ ChangePassword.jsx
│  │     ├─ Dashboard.jsx
│  │     ├─ document.json
│  │     ├─ ForgotPassword.jsx
│  │     ├─ Login.jsx
│  │     ├─ Register.jsx
│  │     ├─ ResetPassword.jsx
│  │     ├─ Search.jsx
│  │     ├─ Upload.jsx
│  │     └─ VerifyEmail.jsx
│  └─ vite.config.js
├─ migrate_peks.sql
└─ README.md

```