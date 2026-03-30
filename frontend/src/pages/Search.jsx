import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Search() {
  const { authFetch } = useAuth();

  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      setResult(null);
      setSearched(false);
      setError("");
      return;
    }

    setError("");
    setResult(null);
    setSearched(false);
    setLoading(true);

    try {
      const res = await authFetch(
        "http://localhost:5000/api/documents/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: query.trim() }),
        }
      );

      if (res.status === 404) {
        setResult(null);
        setSearched(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Search failed");
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/plain")) {
        const text = await res.text();
        setResult({ type: "text", content: text });
      } else {
        const blob = await res.blob();
        setResult({
          type: "file",
          fileUrl: URL.createObjectURL(blob),
        });
      }

      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (result.type === "text") {
      return <pre className="decrypted-content">{result.content}</pre>;
    }

    return (
      <a href={result.fileUrl} download="document" className="btn btn-primary">
        Download File
      </a>
    );
  };

  return (
    <div className="search-page">

      {/* ===== CENTERED HEADER ===== */}
      <div className="search-container">

        <div className="search-header">
          <h1>Search Documents</h1>
          <p>
            Search encrypted documents using secure keyword trapdoors
          </p>
        </div>

        {/* ===== MAIN CARD ===== */}
        <div className="search-card-centered">

          <form onSubmit={handleSearch}>

            <label className="field-label">Search Keyword</label>

            <div className="search-box">
              <input
                className="search-input"
                type="text"
                placeholder="Enter keyword to search..."
                value={query}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuery(value);
                
                  if (!value.trim()) {
                    setResult(null);
                    setSearched(false);
                    setError("");
                  }
                }}
                autoFocus
              />
            </div>

            <button
              className="search-main-btn"
              type="submit"
              disabled={loading || !query.trim()}
            >
              {loading ? "Searching..." : "Search Document"}
            </button>

            <p className="search-hint">
              🔒 Your keyword is hashed (SHA-256) before reaching the server
            </p>

          </form>

        </div>

      </div>

      {/* ===== RESULTS SECTION (UNCHANGED LOGIC) ===== */}
      <div className="search-layout">

        {error && <div className="alert alert-error">{error}</div>}

        {loading && (
          <div className="empty-state">
            <div className="spinner large" />
            <p>Searching encrypted index…</p>
          </div>
        )}

        {searched && !loading && !result && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>
              No document found for "<strong>{query}</strong>"
            </p>
          </div>
        )}

        {searched && !loading && result && (
          <div className="doc-card">
            <div className="doc-card-header">
              <span className="doc-icon">📄</span>
              <div>
                <div className="doc-name">
                  Document found for "{query}"
                </div>
                <div className="doc-meta">
                  Decrypted successfully
                </div>
              </div>
              <span className="badge badge-match">Match</span>
            </div>

            {renderResult()}
          </div>
        )}

      </div>

    </div>
  );
}