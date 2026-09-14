<div align="center">

<img src="docs/brand/banner.svg" alt="NerdPortal: the IT department's front door, not another ticket queue" width="100%">

The intranet the IT department never gets around to building. Systems,
documents, announcements and metrics on one page, readable by everyone without
a login.

[![License](https://img.shields.io/badge/license-MIT-7C3AED)](LICENSE) ![Stack](https://img.shields.io/badge/Next.js%2014-Express%204-7C3AED) ![Database](https://img.shields.io/badge/SQLite-no%20server-A855F7) ![Tests](https://img.shields.io/badge/tests-120%20passing-0F7A42)

[The screens](#the-screens) · [How it works](#how-it-works) · [Run it](#run-it) · [Make it yours](#make-it-yours) · [Configure](#configure) · [Security](#security) · [License](#license)

</div>

---

## What it is

Every IT department ends up answering the same four questions over and over.
*Which system do I use for that? Where is the VPN document? Is the printer down
again? Who do I email about access?* The answers exist, scattered across chat
threads, a wiki nobody updates and one person's memory.

NerdPortal puts them on one page. Anyone in the company can read it without an
account: the system catalogue with live status, the document repository, the
announcements and the team directory. Only writing needs a login, so keeping it
current doesn't turn into a second job.

<div align="center">
<img src="docs/screenshots/home.webp" alt="The NerdPortal home page" width="88%">
</div>

---

## The screens

<table>
<tr>
<td width="50%"><img src="docs/screenshots/systems.webp" alt="The system catalogue"><br><sub><b>Systems</b> · every internal tool, its status and who owns it</sub></td>
<td width="50%"><img src="docs/screenshots/dashboard.webp" alt="The metrics dashboard"><br><sub><b>Metrics</b> · KPIs grouped by category, with the period they cover</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/team.webp" alt="The team directory"><br><sub><b>Team</b> · who does what, and how to reach them</sub></td>
<td width="50%"><img src="docs/screenshots/announcements.webp" alt="The announcements list"><br><sub><b>Announcements</b> · pinned items stay at the top</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/documents.webp" alt="The document repository"><br><sub><b>Documents</b> · uploads with category, size and uploader</sub></td>
<td width="50%"><img src="docs/screenshots/login.webp" alt="The sign-in screen"><br><sub><b>Sign in</b> · only needed to change something</sub></td>
</tr>
</table>

> These aren't mockups. It's the app running against a seeded database,
> captured with a headless browser.

---

## How it works

The whole thing runs on one rule: **public read, restricted write**.

```
GET  /api/v1/systems        no session        anyone can read
GET  /api/v1/announcements  no session
GET  /api/v1/documents      no session
     │
POST/PUT/DELETE             session + role    only an admin can write
     │
[1] session cookie          httpOnly, SQLite-backed store
     │
[2] CSRF double-submit      cookie + X-CSRF-Token header must match
     │
[3] role check              requireRole("admin")
     │
[4] audit log               who, what, when, from which IP
```

### Three decisions worth explaining

**Reading needs no account.** Put the whole intranet behind a login and people
stop checking it, because the friction costs more than the answer is worth.
Here the content is open to the network and only writes are gated.

**SQLite, not Postgres.** An IT portal for one company is a handful of tables
read by a few hundred people. A database server would be one more thing to back
up, patch and monitor, with nothing to show for it. The whole database is a
file on a Docker volume, so backing it up is `cp`.

**The CSRF cookie is `SameSite=Lax`, deliberately.** The frontend (`:3000`) and
the API (`:4000`) are different origins in the default layout. With `Strict`
the browser never sends the cookie back, and login fails with a 403 that looks
exactly like a wrong password. The protection is the double submit itself: an
attacker's page cannot *read* the cookie to echo it in the header. Set
`COOKIE_SAMESITE=none` (HTTPS only) if you split the two across unrelated
domains.

---

## Run it

You need **Docker** and nothing else. Node, the database and the build all
live in the containers.

```bash
git clone https://github.com/nerdresolve/NerdPortal.git
cd NerdPortal
cp .env.example .env
```

Two values in `.env` have no default, and the stack will not start without
them:

```bash
# a random string, 64+ characters
SESSION_SECRET=$(openssl rand -hex 32)
# the first admin's password. There is no built-in default
ADMIN_SEED_PASSWORD=choose-something-long
```

Then:

```bash
cd docker
docker compose --env-file ../.env up -d --build
```

The portal comes up at **http://localhost:3000**, the API at
**http://localhost:4000**. Sign in with `admin@example.com` and the password
you just set.

```bash
docker compose logs -f backend
curl -s http://localhost:4000/api/v1/health
```

```json
{ "success": true, "data": { "status": "ok", "timestamp": "..." } }
```

### Without Docker, for development

```bash
cd apps/backend  && npm install && npm run migrate && npm run dev
cd apps/frontend && npm install && npm run dev
```

`better-sqlite3` compiles a native module, so this path needs a C++ toolchain:
`build-essential` on Debian, Xcode CLT on macOS, Visual Studio Build Tools on
Windows. Use Docker if you would rather not set that up.

### Tests

```bash
cd apps/backend && npm install && npm test
```

120 tests covering authentication, authorization, CSRF, session storage, upload
path traversal, XSS sanitizing and the full password-reset flow.

---

## Make it yours

The portal should carry your branding, not NerdResolve's. **One file does it:**
[`apps/frontend/brand.config.js`](apps/frontend/brand.config.js).

```js
const brand = {
  name: "NerdPortal",
  organization: "NerdResolve",
  tagline: "The IT department's front door...",

  logo: "/logo.svg",
  favicon: "/favicon.svg",

  colors: {
    primary: "#7C3AED",     // buttons, links, headings, active nav
    accent:  "#A855F7",     // badges, chart accents
    // ...semantic and neutral colors
  },

  fonts: { primary: '"Manrope", ...' },

  support: { email: "it@example.com", phone: "...", hours: "..." },
};
```

Every color becomes a CSS custom property at render time. Change `primary` and
the buttons, links, headings, focus rings, badges, active sidebar item and login
panel all follow. No stylesheet to hunt through.

| To change | Do this |
|---|---|
| Name in the header, tab title, emails | `name` and `organization` |
| Every accent color in the UI | `colors.primary` and `colors.accent` |
| The logo | replace `apps/frontend/public/logo.svg` (and `logo-dark.svg` for the login panel) |
| The favicon | replace `apps/frontend/public/favicon.svg` |
| Typeface | `fonts.primary`, plus the `<link>` in `pages/_document.js` if it is a webfont |
| Support contact on the Support page | the `support` block |

The values shipped in the file are NerdResolve's own identity, which is the
stock look in the screenshots above.

---

## Configure

Everything else comes from the environment. No credential has a default in the
code, and `.env` is gitignored.

| Variable | Required | What it is |
|---|---|---|
| `SESSION_SECRET` | yes | Session signing key, 64+ random characters |
| `ADMIN_SEED_PASSWORD` | yes | First admin's password. Empty = the seed refuses to run |
| `ADMIN_SEED_EMAIL` | no | Defaults to `admin@example.com` |
| `ADMIN_SEED_NAME` | no | Defaults to `IT Administrator` |
| `SQLITE_DB_PATH` | no | Ignored under Docker (always `/data/nerdportal.db`) |
| `BCRYPT_ROUNDS` | no | Password hashing cost. Default `12` |
| `COOKIE_SAMESITE` | no | `lax` (default), or `none` for unrelated domains over HTTPS |
| `COOKIE_SECURE` | no | `false` (default). Set `true` once you are behind HTTPS |
| `ALLOWED_ORIGINS` | no | Extra CORS origins, comma separated |
| `FRONTEND_URL` | no | Used to build the link in reset emails |
| `NEXT_PUBLIC_API_URL` | no | API URL the **browser** calls |
| `INTERNAL_API_URL` | no | API URL the Next.js server calls during SSR |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `SMTP_FROM_EMAIL` | for reset | Password recovery stays disabled until these are set |
| `PASSWORD_RESET_CODE_TTL_MINUTES` | no | Code lifetime. Default `15` |
| `PASSWORD_RESET_MAX_ATTEMPTS` | no | Wrong codes before lockout. Default `5` |

---

## Under the hood

```
apps/
  backend/
    src/server.js       middleware order: helmet, CORS, session, XSS, CSRF, routes
    routes/             one file per resource, role guards declared here
    controllers/        request shape in, response shape out
    dal/                every SQL statement lives here, parameterized
    middlewares/        auth, csrf, rateLimit, securityHeaders, upload, xssSanitizer
    services/           email (hand-rolled SMTP), password reset, uploads
    tests/              120 unit + integration tests
  frontend/
    brand.config.js     >>> the one file you edit to rebrand <<<
    components/         Header, Sidebar, Footer, Layout, BrandStyles
    pages/              one file per screen
    styles/             CSS modules + globals.css (design tokens)
database/
  migrations/           numbered, idempotent, applied in order
  seeds/                the first admin, and nothing else
```

The `dal/` boundary keeps SQL out of the controllers. Every query is a prepared
statement with bound parameters, so a route handler has no way to build a
string that reaches the database.

---

## Security

What is actually implemented, so you can judge it instead of trusting a badge:

- **Passwords.** bcrypt, cost 12, never logged. Minimum 12 characters with
  upper, lower and a digit, enforced server-side.
- **Sessions.** httpOnly cookie, 8-hour rolling expiry, stored in SQLite. It
  survives a restart, and deleting a row revokes it.
- **CSRF.** Double-submit token on every non-GET request.
- **Rate limiting.** Per-IP on login and on each password-reset step.
- **Uploads.** Extension and MIME allowlist, size cap, filenames sanitized, and
  every resolved path checked to be inside the uploads directory before a
  write. Path traversal is covered by tests.
- **XSS.** Request bodies are sanitized on the way in. Credential fields are
  exempt on purpose, since they are compared as opaque values and never
  rendered.
- **Headers.** helmet, with `X-Frame-Options: DENY` and `nosniff` on the
  frontend too.
- **Audit log.** Every mutation records actor, action, target and IP.

**Set `COOKIE_SECURE=true` in production.** It ships `false` so that a first
run over plain HTTP can sign in at all. Without TLS a `Secure` cookie is
dropped silently, which looks exactly like a wrong password. Turn it on once
HTTPS is in front. Until then, session cookies cross the network in the clear.

**What it does not do.** There is no SSO or LDAP integration, so accounts are
local. There is no per-record permission model either: a role is `admin`,
`editor` or `viewer`, and that is the whole matrix.

---

## Known limitations

- **SQLite means one writer.** Fine for a few hundred readers and a handful of
  editors. Not the right call for a portal serving tens of thousands.
- **Uploads live on a Docker volume**, not object storage. Back up the volume.
- **The UI ships in English only.** Strings are inline in the components, so
  there is no i18n layer yet.
- **Dates are formatted `en-US`** and rendered from date-only values, so a
  period can read one day off in timezones far from UTC.

---

## License

MIT. Use it, fork it, sell it, rebrand it. See [LICENSE](LICENSE).

Built by [NerdResolve](https://github.com/nerdresolve).
