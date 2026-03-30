export default function About() {
  const modules = [
    { icon: "🖥", title: "User Interface", desc: "Secure web interface for login, encryption, and keyword search operations." },
    { icon: "🗄", title: "Data Storage", desc: "Encrypted ciphertext and keyword index stored in MySQL. Plaintext never persists." },
    { icon: "🔑", title: "Key Management", desc: "RSA/ElGamal public-private key pair generation. Private key stored securely, public key distributed." },
    { icon: "🔒", title: "Encryption & Indexing", desc: "AES-256-CBC for content. SHA-256 hashing for keywords. Encrypted index maps document IDs to keyword hashes." },
    { icon: "🚪", title: "Trapdoor Generation", desc: "Cryptographic token derived from private key + keyword hash. Sent to server to initiate search without revealing the keyword." },
    { icon: "🛡", title: "Access Control", desc: "Role-based control: Users manage their own data. Admins operate the system but cannot view or decrypt user content." },
  ];

  const team = [
    { name: "Pothula Anjali", roll: "22321A1214" },
    { name: "Banoth Poojitha", roll: "22321A1261" },
    { name: "Thokala Archana", roll: "22325A1203" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">About the Project</h1>
          <p className="page-sub">Privacy-Preserving Searchable Encryption for Web Services</p>
        </div>
      </div>

      <div className="about-grid">
        <div className="about-card wide">
          <h2 className="section-title">Problem Statement</h2>
          <p className="about-text">
            Traditional encryption secures data but makes keyword search impossible without full decryption,
            compromising confidentiality. Existing Searchable Encryption (SE) methods present trade-offs:
            RSA is secure but slow, while SSE is fast but vulnerable to frequency analysis attacks.
          </p>
          <p className="about-text">
            PPSE resolves this by implementing a <strong>Public Key Encryption with Keyword Search (PEKS)</strong> scheme
            — users can search encrypted data using cryptographic trapdoors, without the server ever learning
            the actual keyword or document content.
          </p>
        </div>

        <div className="about-card">
          <h2 className="section-title">Tech Stack</h2>
          <div className="tech-list">
            {[
              ["Frontend", "React + Vite + Tailwind"],
              ["Backend", "Node.js + Express.js"],
              ["Database", "MySQL"],
              ["Encryption", "AES-256-CBC + SHA-256"],
              ["Auth", "JWT + bcrypt"],
              ["Search", "PEKS Scheme"],
            ].map(([k, v]) => (
              <div key={k} className="tech-row">
                <span className="tech-key">{k}</span>
                <span className="tech-val">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="about-card">
          <h2 className="section-title">System Modules</h2>
          <div className="modules-list">
            {modules.map((m) => (
              <div key={m.title} className="module-item">
                <span className="module-icon">{m.icon}</span>
                <div>
                  <div className="module-title">{m.title}</div>
                  <div className="module-desc">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="about-card">
          <h2 className="section-title">Team</h2>
          <div className="team-list">
            {team.map((t) => (
              <div key={t.roll} className="team-member">
                <div className="team-avatar">{t.name[0]}</div>
                <div>
                  <div className="team-name">{t.name}</div>
                  <div className="team-roll">{t.roll}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="college-badge">
            <div className="college-name">Bhoj Reddy Engineering College for Women</div>
            <div className="college-dept">Department of Information Technology · AY 2025-26</div>
            <div className="college-guide">Guide: B. Anitha | HOD: Dr. M. Sandhya Rani</div>
          </div>
        </div>
      </div>
    </div>
  );
}
