# 🔐 PPSE – Privacy-Preserving Searchable Encryption System

PPSE is a full-stack web application that allows users to upload, store, and search documents securely using **searchable encryption**. It ensures **data privacy**, **search confidentiality**, and **access control** using cryptography and token-based authentication.

---

## 🚀 Features


- 🔑 User Registration & Login (JWT Auth)
- 📁 Encrypted Document Upload (AES-256)
- 🔍 Privacy-Preserving Keyword Search (SHA-256 Hash)
- 🧩 Access Control with Token Verification
- 🧠 Unlinkability of Search Queries
- 🛡️ No admin visibility of user documents or search queries

---

## 🏗️ Architecture – MVC

- **Model**: MySQL – Stores users and encrypted document data
- **View**: React – Frontend for users to interact
- **Controller**: Node.js/Express – Handles logic, encryption, and routing


---

## 🛠️ Tech Stack

- **Frontend**: React, Axios, Bootstrap
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Security**: AES-256 (Encryption), SHA-256 (Keyword Hashing), JWT (Authentication)
- **Tools**: Git, GitHub, Postman, VS Code

---

## ⚙️ How It Works – Step by Step

1. **User Authentication**  
   Login/Register using JWT tokens to secure each session.

2. **Document Upload with Encryption**  
   Users upload documents that are encrypted using AES-256 before being stored in the database.

3. **Searchable Encryption**  
   User keywords are hashed with SHA-256 and stored, enabling private keyword search.

4. **Access Control**  
   Token-based verification ensures only the owner can access/search their files.

5. **Document Decryption**  
   Retrieved documents are decrypted on request and shown/downloaded securely.

---

## 🌐 How to Run the Project Locally

### Backend (Node.js)
```bash
cd backend
npm install
# Add your .env file with DB and JWT keys
node server.js
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
```
PPSE System
├─ backend
│  ├─ .env
│  ├─ config
│  │  └─ db.js
│  ├─ crypt.js
│  ├─ jwt.js
│  ├─ middleware
│  │  └─ authMiddleware.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ authRoutes.js
│  │  └─ documentRoutes.js
│  ├─ server.js
│  └─ utils
│     └─ crypto.js
└─ frontend
   ├─ eslint.config.js
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ public
   │  └─ vite.svg
   ├─ src
   │  ├─ App.jsx
   │  ├─ components
   │  │  └─ Navbar.jsx
   │  ├─ context
   │  │  ├─ AuthContext.jsx
   │  │  └─ ThemeContext.jsx
   │  ├─ index.css
   │  ├─ main.jsx
   │  └─ pages
   │     ├─ About.jsx
   │     ├─ Dashboard.jsx
   │     ├─ Login.jsx
   │     ├─ Register.jsx
   │     ├─ Search.jsx
   │     └─ Upload.jsx
   └─ vite.config.js

```