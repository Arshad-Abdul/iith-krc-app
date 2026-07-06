export default function Dashboard({ patron, onLogout }) {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>KRC Admin Panel</h1>
          <p>
            Signed in as {patron.firstname} {patron.surname} ({patron.userid})
          </p>
        </div>
        <button onClick={onLogout}>Sign Out</button>
      </header>

      <section className="dashboard-placeholder">
        <p>
          Authentication is wired up and gated to superlibrarian accounts only. Circulation,
          procurement approvals, and review moderation screens go here next, backed by the same
          Koha API the login just authenticated against.
        </p>
      </section>
    </div>
  );
}
