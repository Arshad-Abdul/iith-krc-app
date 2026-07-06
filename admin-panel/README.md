# KRC Admin Panel

Standalone staff-only admin panel — separate project, separate ports, not bundled into the patron mobile app.

- `server/` — Express API on port **4001**. Holds no Koha credentials in code; forwards whatever staff userid/password is submitted to Koha (Basic Auth), and only grants access if that account has Koha's **superlibrarian** permission. Sessions are server-side, identified by an httpOnly cookie.
- `web/` — React (Vite) frontend on port **5174**. Talks only to the local API server, never directly to Koha.

## Setup

```bash
cd admin-panel/server
cp .env.example .env   # edit KOHA_API_BASE_URL once confirmed
npm install
npm run dev

cd ../web
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5174.

## Koha REST API status

`KOHA_API_BASE_URL=https://opac.krc.iith.ac.in:8080/api/v1` is confirmed working — Koha's native REST API (Plack/Starman) is enabled and publicly reachable on the intranet port. `/api/v1/patrons` returns proper JSON auth errors (401/403), confirming the endpoint shape.

Still to verify:
1. The exact endpoint Koha uses to expose a patron's permissions for `hasSuperlibrarianPermission` in `server/src/kohaClient.js` — written against the commonly documented `/patrons/{id}/permissions` shape but not yet tested against a real superlibrarian login.
2. Rotate the `libadmin` SSH/server password and the `koha_library` DB password — both were shared in plaintext chat during setup.

## What's built vs. what's next

Built: superlibrarian-gated login, server-side session, a couple of read endpoints (`/api/patrons`, `/api/patrons/:id/checkouts`).

Not yet built: the circulation (issue/return), procurement approval, and review moderation screens that existed as mock UI in the old in-app `admin-dashboard.jsx`. Those need to be rebuilt here against real Koha endpoints rather than ported as-is, since they were mock data before.
