import { useState } from "react";

export default function Login({ onLogin }) {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await onLogin(userid.trim(), password); }
    catch (err) { setError(err.message || "Login failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>KRC Admin Panel</h1>
        <p className="auth-subtitle">Superlibrarian access only.</p>
        <label>Koha Staff User ID<input value={userid} onChange={(e) => setUserid(e.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
      </form>
    </div>
  );
}
