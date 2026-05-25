// src/api.js
// Single source of truth for the backend base URL.
// Vite replaces import.meta.env.VITE_API_URL at BUILD TIME,
// so this value is baked in during `npm run build`.
//
// Set in Vercel dashboard → Project → Settings → Environment Variables:
//   Key:   VITE_API_URL
//   Value: https://your-app.up.railway.app   ← no trailing slash
//   Environments: ✅ Production  ✅ Preview  ✅ Development

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn(
    "[CipherSeek] VITE_API_URL is not set. " +
    "Add it in Vercel → Settings → Environment Variables and redeploy."
  );
}

export default API_URL;
