import { useState } from "react";
import { issueBook, returnBook } from "../api.js";

const fmt = (dt) => dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function IssuePanel() {
  const [barcode, setBarcode] = useState("");
  const [patronId, setPatronId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!barcode.trim() || !patronId.trim()) return;
    setLoading(true); setResult(null); setError("");
    try {
      const data = await issueBook(barcode.trim(), patronId.trim());
      setResult(data);
      setBarcode(""); setPatronId("");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="circ-panel">
      <h3>Issue Book</h3>
      <form onSubmit={submit}>
        <label>Patron ID (numeric)<input type="text" value={patronId} onChange={(e) => setPatronId(e.target.value)} placeholder="e.g. 10810" /></label>
        <label>Item Barcode<input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type barcode" autoFocus /></label>
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">{loading ? "Issuing…" : "Issue Book"}</button>
      </form>
      {result && (
        <div className="circ-result success">
          <p>✓ Issued successfully</p>
          <p><strong>Item:</strong> {result.item?.callnumber || result.item?.item_id}</p>
          <p><strong>Due:</strong> {fmt(result.checkout?.due_date)}</p>
        </div>
      )}
    </div>
  );
}

function ReturnPanel() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    setLoading(true); setResult(null); setError("");
    try {
      const data = await returnBook(barcode.trim());
      setResult(data);
      setBarcode("");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="circ-panel">
      <h3>Return Book</h3>
      <form onSubmit={submit}>
        <label>Item Barcode<input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type barcode" /></label>
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">{loading ? "Processing…" : "Return Book"}</button>
      </form>
      {result && (
        <div className="circ-result success">
          <p>✓ Returned successfully</p>
          <p><strong>Item:</strong> {result.item?.callnumber || result.item?.item_id}</p>
          <p><strong>Was due:</strong> {fmt(result.checkout?.due_date)}</p>
          {result.checkout?.due_date && new Date(result.checkout.due_date) < new Date() && (
            <p className="overdue-note">⚠ This item was overdue</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function IssueReturn() {
  return (
    <div>
      <h2 className="page-title">Issue / Return</h2>
      <div className="circ-grid">
        <IssuePanel />
        <ReturnPanel />
      </div>
    </div>
  );
}
