export default function AppDownloads() {
  const buildUrl = "https://expo.dev/accounts/arshadiith/projects/library-app-rn/builds/d7fe2ad2-e658-4a3a-b531-599fc18d4b0d";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(buildUrl)}`;

  return (
    <div style={{ maxWidth: "840px" }}>
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title">KRC Mobile App Builds & Downloads</h2>
          <p className="panel-subtitle">Download the latest installable Android APK package or scan QR code directly on student/staff phones.</p>
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap", padding: "28px" }}>
        <div style={{ background: "#ffffff", padding: "12px", borderRadius: "12px" }}>
          <img src={qrCodeUrl} alt="Download App QR Code" style={{ width: "180px", height: "180px", display: "block" }} />
        </div>

        <div style={{ flex: 1, minWidth: "260px" }}>
          <span className="badge-green" style={{ marginBottom: "10px", display: "inline-block" }}>
            LATEST BUILD • EXPO EAS READY
          </span>
          <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc", marginBottom: "6px" }}>
            KRC Mobile App (Android APK)
          </h3>
          <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "16px" }}>
            Version: <strong>1.0.0 (Build 2026.08)</strong><br />
            Includes: Live Occupancy, DDS / ILL Portal, Koha Patron Photos, DDC Subject Interests, and Magzter e-Periodicals.
          </p>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href={buildUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-gold"
              style={{ textDecoration: "none" }}
            >
              📱 Download APK / Open EAS Build
            </a>
          </div>
        </div>
      </div>

      <div className="form-card" style={{ marginTop: "24px" }}>
        <h4 style={{ fontSize: "15px", fontWeight: "bold", color: "#f8fafc", marginBottom: "10px" }}>
          📱 How to Install on Android Phones
        </h4>
        <ol style={{ paddingLeft: "20px", color: "#cbd5e1", fontSize: "13px", lineHeight: "1.8" }}>
          <li>Scan the QR code above with any phone camera (or tap the download button).</li>
          <li>Download the <code>.apk</code> installer file to the device.</li>
          <li>When prompted by Android, tap <strong>Install</strong> (Allow <em>&apos;Install from this source&apos;</em> if requested).</li>
          <li>Login with your Koha patron credentials or scan your library digital ID.</li>
        </ol>
      </div>
    </div>
  );
}
