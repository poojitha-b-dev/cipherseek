# CipherSeek

### Secure Searchable Encryption Platform

CipherSeek is a full-stack cryptography-focused web application designed for privacy-preserving encrypted document storage and secure keyword search using a PEKS-inspired searchable encryption architecture.

The platform enables users to securely upload encrypted documents, generate protected searchable indexes, and perform encrypted keyword verification without exposing plaintext data.

---

# Live Demo

## Frontend

https://your-vercel-url.vercel.app

## Backend

https://your-railway-url.up.railway.app

---

# Key Highlights

* AES-256-CBC document encryption
* PEKS-inspired searchable encryption
* Secure trapdoor generation
* JWT authentication with refresh-token rotation
* Session-only authentication persistence
* Email verification and password reset system
* Privacy-preserving keyword search
* Secure encrypted document retrieval
* Modern responsive UI with dark/light themes
* Production-style deployment architecture

---

# System Overview

CipherSeek allows users to:

* Register and verify accounts securely
* Upload encrypted documents
* Generate searchable encrypted indexes
* Search encrypted data without exposing plaintext keywords
* Retrieve matching encrypted documents securely
* Maintain authenticated sessions securely using rotating refresh tokens

The system prevents direct exposure of:

* plaintext document contents
* raw search keywords
* encryption-sensitive storage data

---

# Features

## Authentication & Session Security

* User Registration
* Email Verification
* JWT Authentication
* Refresh Token Rotation
* Session-only Persistence
* Silent Access Token Refresh
* Secure Logout Invalidation
* Forgot Password Flow
* Password Reset Flow
* Change Password Functionality
* Disposable Email Detection
* Custom Rate Limiting
* Protected API Routes

---

## Cryptography & Searchable Encryption

* AES-256-CBC Encryption
* SHA-256 Keyword Hashing
* HMAC-SHA256 Integrity Validation
* ECDH secp256k1 Key Derivation
* PEKS-inspired Searchable Encryption
* Trapdoor-based Keyword Verification
* Encrypted Index Matching
* Duplicate Detection using Secure Trapdoor Verification

---

## Frontend

* React + Vite
* Context API State Management
* Responsive UI Design
* Dark/Light Theme Support
* Custom CSS Design System
* Session-based Authentication Persistence

---

## Backend

* Express.js REST API
* MySQL Database Integration
* Secure Middleware Architecture
* Authentication Middleware
* Custom Security Utilities
* Email Service Integration using Brevo API

---

# Tech Stack

| Layer             | Technology                 |
| ----------------- | -------------------------- |
| Frontend          | React, Vite                |
| Backend           | Node.js, Express.js        |
| Database          | MySQL                      |
| Deployment        | Vercel + Railway           |
| Email Service     | Brevo API                  |
| Encryption        | AES-256-CBC                |
| Search Encryption | PEKS-inspired Architecture |
| Authentication    | JWT + Refresh Tokens       |

---

# Project Architecture

```txt
Client (React + Vite)
        │
        ▼
Authentication Layer
(JWT + Refresh Rotation)
        │
        ▼
Searchable Encryption Layer
(AES-256-CBC + PEKS)
        │
        ▼
Express Backend API
        │
        ▼
MySQL Database
```

---

# Authentication Flow

```txt
User Login
    │
    ▼
JWT Access Token Issued
    │
    ▼
Refresh Token Stored in sessionStorage
    │
    ▼
Access Token Stored Only in Memory
    │
    ▼
Silent Token Refresh
    │
    ▼
Secure Session Persistence
```

---

# Encryption Workflow

```txt
Document Upload
      │
      ▼
AES-256-CBC Encryption
      │
      ▼
Keyword Extraction
      │
      ▼
SHA-256 Hashing
      │
      ▼
Trapdoor Generation
      │
      ▼
Encrypted Index Storage
      │
      ▼
Secure Search Verification
```

---

# Searchable Encryption Workflow

```txt
Keyword
   │
   ▼
SHA-256 Hash
   │
   ▼
Trapdoor Generation
   │
   ▼
Encrypted Index Verification
   │
   ▼
Matching Encrypted Documents
```

---

# Folder Structure

```txt
project-root/
│
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   ├── crypt.js
│   ├── peks.js
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── index.html
│   ├── vite.config.js
│   └── vercel.json
│
└── README.md
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/poojitha-b-dev/cipherseek.git
cd cipherseek
```

---

# Backend Setup

```bash
cd backend
npm install
npm start
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

Frontend runs on:

```txt
http://localhost:5173
```

---

# Environment Variables

## Backend `.env`

```env
PORT=

DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=

JWT_SECRET=
JWT_REFRESH_SECRET=

ENCRYPTION_KEY=
PEKS_MASTER_SECRET=

BREVO_API_KEY=
MAIL_FROM=

FRONTEND_URL=
```

---

## Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
```

---

# API Endpoints

## Authentication Routes

```txt
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/change-password
POST   /api/auth/resend-verification

GET    /api/auth/verify-email/:token
GET    /api/auth/me
```

---

## Document Routes

```txt
POST   /api/documents/save
POST   /api/documents/verify
GET    /api/documents
```

---

# Deployment

## Frontend Deployment

Hosted using:

* Vercel

Features:

* Automatic GitHub redeployment
* Environment variable management
* Production build optimization

---

## Backend Deployment

Hosted using:

* Railway

Features:

* Automatic GitHub redeployment
* Secure environment variable management
* Managed deployment pipeline

---

# Security Design

## Authentication Security

* Access tokens are never persisted in localStorage
* Refresh tokens rotate automatically
* Session data clears on browser close
* Secure logout invalidation implemented
* Expiration handling included
* Protected route middleware enabled

---

## Encryption Security

* Secure IV generation
* AES-256-CBC encryption
* SHA-256 hashing
* Trapdoor-based verification
* No plaintext document storage
* No raw keyword exposure

---

# Screenshots

Add screenshots for:

* Login Page
* Register Page
* Dashboard
* Upload Page
* Search Page
* Dark Theme
* Light Theme

---

# Future Improvements

* Zero-Knowledge Storage Architecture
* Multi-user Secure File Sharing
* Search Ranking Algorithms
* Search Analytics Dashboard
* Advanced Searchable Encryption Schemes
* Cryptographic Audit Logging
* End-to-End Key Isolation

---

# Author

### Banoth Poojitha

GitHub:
https://github.com/poojitha-b-dev

---


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
│  │  ├─ 002_auth_upgrade.sql
│  │  └─ migration_003_final.sql
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
│  │  ├─ logo.png
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ api.js
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  └─ hero-bg.png
│  │  ├─ components
│  │  │  ├─ CooldownTimer.jsx
│  │  │  ├─ EyeToggle.jsx
│  │  │  ├─ Navbar.jsx
│  │  │  └─ PasswordStrength.jsx
│  │  ├─ context
│  │  │  ├─ AuthContext.jsx
│  │  │  └─ ThemeContext.jsx
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  └─ pages
│  │     ├─ About.jsx
│  │     ├─ ChangePassword.jsx
│  │     ├─ Dashboard.jsx
│  │     ├─ ForgotPassword.jsx
│  │     ├─ Login.jsx
│  │     ├─ Register.jsx
│  │     ├─ ResetPassword.jsx
│  │     ├─ Search.jsx
│  │     ├─ Upload.jsx
│  │     └─ VerifyEmail.jsx
│  ├─ vercel.json
│  └─ vite.config.js
├─ migrate_peks.sql
├─ package-lock.json
├─ package.json
└─ README.md

```