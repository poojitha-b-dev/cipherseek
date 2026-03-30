# 🔐 PPSE – Privacy-Preserving Searchable Encryption System

PPSE is a full-stack web application that allows users to upload, store, and search documents securely using **privacy-preserving searchable encryption (PEKS-inspired)**. It ensures **data privacy**, **keyword confidentiality**, and **secure search** using cryptographic techniques and token-based authentication.

---

## 🚀 Features

* 🔑 User Registration & Login (JWT Auth)
* 📁 Encrypted Document Upload (AES-256)
* 🔍 Privacy-Preserving Keyword Search (PEKS-based)
* 🧩 Trapdoor-Based Secure Matching
* 🧠 Unlinkability (same keyword → different ciphertext)
* 🛡️ No plaintext keyword stored in database
* 🔒 No admin visibility of user documents or search queries

---

## 🏗️ Architecture – MVC

* **Model**: MySQL – Stores encrypted documents and PEKS ciphertext
* **View**: React – Frontend for user interaction
* **Controller**: Node.js/Express – Handles encryption, PEKS logic, and routing

---

## 🛠️ Tech Stack

* **Frontend**: React, Axios, Bootstrap
* **Backend**: Node.js, Express.js
* **Database**: MySQL
* **Security**:

  * AES-256 (Document Encryption)
  * PEKS-inspired ECC (Keyword Encryption)
  * JWT (Authentication)
* **Tools**: Git, GitHub, Postman, VS Code

---

## ⚙️ How It Works – Step by Step

1. **User Authentication**
   Login/Register using JWT tokens to secure each session.

2. **Document Upload with Encryption**

   * Documents are encrypted using **AES-256**
   * Keywords are converted into **PEKS ciphertext (A, B, tag)**
   * Stored securely in the database

3. **Privacy-Preserving Search**

   * User enters a keyword
   * Keyword → converted into **Trapdoor**
   * Server runs **Test() function** on encrypted data
   * Matching documents are returned

4. **Access Control**
   Token-based verification ensures only the owner can access/search their files.

5. **Document Decryption**
   Retrieved documents are decrypted securely and displayed/downloaded.

---

## 🔐 Security Design

| Component | Method            | Purpose                     |
| --------- | ----------------- | --------------------------- |
| Document  | AES-256           | Data confidentiality        |
| Keyword   | PEKS (ECC-based)  | Secure search               |
| Search    | Trapdoor + Test() | Privacy-preserving matching |
| Auth      | JWT               | Access control              |

---

## ⚠️ Note

This system implements a **PEKS-inspired approach using elliptic curve cryptography (ECDH)**.
A full pairing-based PEKS is not implemented due to practical limitations in Node.js.

---

## 🌐 How to Run the Project Locally

### Backend (Node.js)

```bash id="1"
cd backend
npm install
# Add your .env file with DB, JWT, and PEKS_MASTER_SECRET
node server.js
```

### Frontend (React)

```bash id="2"
cd frontend
npm install
npm run dev
```

### Database Setup

```bash id="3"
mysql -u root -p secure_docs < migrate_peks.sql
```

---

## 🧪 Testing

```bash id="4"
node test_peks.js
```

---

## 📁 Project Structure

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
│  │  └─ vite.svg
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
│  │     ├─ Login.jsx
│  │     ├─ Register.jsx
│  │     ├─ Search.jsx
│  │     └─ Upload.jsx
│  └─ vite.config.js
├─ migrate_peks.sql
└─ README.md

```

## 📌 Summary

* Documents → encrypted using AES
* Keywords → encrypted using PEKS
* Search → performed using trapdoors
* No sensitive data exposed

---

## 📄 License

This project is developed for academic purposes.

---