# ITPortal - Referência Técnica

## Última Atualização: 2026-04-01

---

## 1. Project Overview

ITPortal is an internal institutional platform for the NerdResolve IT department.
It centralizes communication, documents, systems, and metrics under a single
governed portal. Classified as a critical corporate asset.

## 2. Architecture

- **Pattern:** Multi-Page Application (MPA) with Server-Side Rendering (SSR)
- **Communication:** REST API between frontend and backend
- **Deployment:** Docker containers orchestrated via docker-compose

### Service Map

| Service    | Technology       | Port | Description                        |
|------------|------------------|------|------------------------------------|
| frontend   | Next.js 14       | 3000 | SSR pages, components, styles      |
| backend    | Node.js (Express)| 4000 | REST API, controllers, middlewares  |
| db         | PostgreSQL 16    | 5432 | Primary data store                 |

## 3. Directory Structure

```
/itportal
  /apps
    /frontend        -- Next.js application (pages, components, styles, services, public)
    /backend         -- Node.js API (controllers, routes, services, middlewares, dal)
  /database
    /migrations      -- SQL migration files (sequential, timestamped)
    /seeds           -- Initial data for development and staging
  /docker            -- docker-compose.yml and Dockerfiles
  /uploads           -- User-uploaded files (served via backend)
  /docs              -- technical-reference.md, progress.txt, documentacao tecnica
```

## 4. Database Architecture (PostgreSQL 16)

### Design Decisions

- All tables use `UUID` as primary key via `gen_random_uuid()`.
- Timestamps: `created_at` (DEFAULT NOW()), `updated_at` (trigger-managed).
- Soft deletes via `deleted_at` column where applicable.
- All user-facing text columns use `TEXT` type (no arbitrary VARCHAR limits).
- Foreign keys enforce `ON DELETE RESTRICT` by default unless documented otherwise.

### Tables (Initial Schema)

| Table             | Purpose                                    | Status          |
|-------------------|--------------------------------------------|-----------------|
| users             | Authentication, roles, profile             | Migration Ready |
| sessions          | Server-side session management             | Migration Ready |
| audit_logs        | Full audit trail for all mutations          | Migration Ready |
| announcements     | Internal IT communications                 | Migration Ready |
| documents         | File repository metadata                   | Migration Ready |
| systems           | Internal systems catalog                   | Migration Ready |
| team_members      | IT team directory                          | Migration Ready |
| metrics           | Dashboard KPI data                         | Migration Ready |

### Migration Naming Convention

Format: `YYYYMMDDHHMMSS_description.sql`
Example: `20260329120000_create_users_table.sql`

## 5. Security Implementation

| Measure                | Implementation                          | Status  |
|------------------------|-----------------------------------------|---------|
| Password Hashing       | bcrypt (cost factor 12)                 | Done    |
| Session Management     | Secure HTTP-only cookies, SameSite=Strict, connect-pg-simple | Done |
| SQL Injection          | Parameterized queries only (pg library) | Done    |
| XSS Protection         | Content-Security-Policy headers, input sanitization middleware | Done |
| CSRF Protection        | Double-submit cookie (crypto.timingSafeEqual) | Done |
| Security Headers       | Helmet.js middleware                    | Done    |
| Audit Logging          | All mutations logged with user, action, timestamp, IP | Done |
| Rate Limiting          | express-rate-limit on auth (10/15min) and API (100/min) | Done |

## 6. API Design Conventions

- Base path: `/api/v1`
- Response format: `{ success: boolean, data?: any, error?: string }`
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Internal Server Error)
- All routes require authentication except: `POST /api/v1/auth/login`, `GET /api/v1/health`
- Request validation via middleware before controller execution
- CSRF: State-changing requests require `X-CSRF-Token` header matching `csrf_token` cookie

### Implemented Routes

| Method | Path                          | Auth          | Rate Limit | Description                    |
|--------|-------------------------------|---------------|------------|--------------------------------|
| GET    | /api/v1/health                | Public        | 100/min    | DB connectivity check          |
| POST   | /api/v1/auth/login            | Public        | 10/15min   | Authenticate, create session   |
| POST   | /api/v1/auth/logout           | Required      | 100/min    | Destroy session, clear cookies |
| GET    | /api/v1/auth/me               | Public*       | 100/min    | Current session user data      |
| GET    | /api/v1/announcements         | Public        | 100/min    | List announcements (paginated) |
| GET    | /api/v1/announcements/:id     | Public        | 100/min    | Get single announcement        |
| POST   | /api/v1/announcements         | admin         | 100/min    | Create announcement            |
| PUT    | /api/v1/announcements/:id     | admin         | 100/min    | Update announcement            |
| DELETE | /api/v1/announcements/:id     | admin         | 100/min    | Soft-delete announcement       |
| GET    | /api/v1/documents             | Public        | 100/min    | List documents (paginated)     |
| GET    | /api/v1/documents/:id         | Public        | 100/min    | Get document metadata          |
| GET    | /api/v1/documents/:id/download| Public        | 100/min    | Download file                  |
| POST   | /api/v1/documents             | admin         | 100/min    | Upload file (multipart, 10MB)  |
| DELETE | /api/v1/documents/:id         | admin         | 100/min    | Soft-delete + remove file      |
| GET    | /api/v1/systems               | Public        | 100/min    | List systems (filterable)      |
| GET    | /api/v1/systems/:id           | Public        | 100/min    | Get single system              |
| POST   | /api/v1/systems               | admin         | 100/min    | Create system entry            |
| PUT    | /api/v1/systems/:id           | admin         | 100/min    | Update system                  |
| DELETE | /api/v1/systems/:id           | admin         | 100/min    | Soft-delete system             |
| GET    | /api/v1/team                  | Public        | 100/min    | List team members              |
| GET    | /api/v1/team/:id              | Public        | 100/min    | Get single team member         |
| POST   | /api/v1/team                  | admin         | 100/min    | Create team member             |
| PUT    | /api/v1/team/:id              | admin         | 100/min    | Update team member             |
| DELETE | /api/v1/team/:id              | admin         | 100/min    | Soft-delete team member        |
| GET    | /api/v1/metrics               | Public        | 100/min    | List metrics (filterable)      |
| GET    | /api/v1/metrics/:id           | Public        | 100/min    | Get single metric              |
| POST   | /api/v1/metrics               | admin         | 100/min    | Create metric entry            |
| PUT    | /api/v1/metrics/:id           | admin         | 100/min    | Update metric value            |

*`/auth/me` returns 401 if no session exists but does not block the request.

### Auth Flow Detail

1. Client sends `POST /api/v1/auth/login` with `{ email, password }`.
2. Server validates credentials against bcrypt hash in `users` table.
3. On success: session regenerated (prevents fixation), user data stored in session, `itportal.sid` cookie set.
4. On failure: audit log entry created, generic error returned (no user enumeration).
5. Session stored server-side in PostgreSQL `sessions` table via `connect-pg-simple`.
6. Logout destroys session row and clears both `itportal.sid` and `csrf_token` cookies.

## 7. Brand Identity Reference (NerdResolve)

### Color Palette

| Name             | Hex       | Usage                    |
|------------------|-----------|--------------------------|
| Verde NerdResolve   | #007B4E   | Primary, headers, nav    |
| Amarelo NerdResolve | #EAAB00   | Accents, CTAs, icons     |
| Verde 70%        | #629676   | Secondary backgrounds    |
| Amarelo 45%      | #FCD798   | Light accents            |
| Cinza NerdResolve   | #989AA5   | Body text, borders       |

### Typography

- Primary: Abadi MT Std (print materials)
- System/Web fallback: Lucida Grande (Mac), Lucida Sans (Windows)
- Alignment: Left-aligned text only. No centered blocks, no justified text.

### Visual Language

- Trapezoid-based graphic mesh derived from brand symbol
- Graphic elements at 331.3 degree angle (fixed, never rotated)
- No textures, shadows, or gradients on brand elements
- Background must not be fully covered by graphic elements

## 8. Environment Variables Required

```
# Database
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=itportal
POSTGRES_USER=itportal_user
POSTGRES_PASSWORD=<MUST_BE_SET>

# Backend
NODE_ENV=development
BACKEND_PORT=4000
SESSION_SECRET=<MUST_BE_SET>
BCRYPT_ROUNDS=12

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
FRONTEND_PORT=3000
```

## 9. Technical Decisions Log

| Date       | Decision                                     | Rationale                              |
|------------|----------------------------------------------|----------------------------------------|
| 2026-03-29 | PostgreSQL 16 over 15                        | Native UUID generation, JSON improvements |
| 2026-03-29 | Express.js as backend framework              | Mature ecosystem, middleware flexibility |
| 2026-03-29 | Next.js 14 Pages Router (not App Router)     | MPA/SSR alignment per PRD requirement  |
| 2026-03-29 | pg library (node-postgres) for DB access     | Parameterized queries, no ORM overhead |
| 2026-03-29 | No ORM (Sequelize/Prisma)                    | Direct SQL control for security audit  |
| 2026-03-29 | Double-submit cookie for CSRF                | No server state needed, crypto.timingSafeEqual prevents timing attacks |
| 2026-03-29 | connect-pg-simple for sessions               | Sessions in PostgreSQL, consistent with single-DB architecture |
| 2026-03-29 | Session regeneration on login                | Prevents session fixation attacks |
| 2026-03-29 | Dummy bcrypt hash on invalid email           | Constant-time response prevents user enumeration |
| 2026-03-29 | Custom XSS sanitizer over xss-clean         | xss-clean is deprecated, custom middleware gives full control |
| 2026-03-30 | Public Read / Admin Write access model       | Business requirement: all content publicly visible, mutations admin-only |
| 2026-03-30 | optionalAuthSSR replaces requireAuthSSR       | Pages render for all visitors; user=null for anonymous, user={...} for admin |
| 2026-03-30 | editor role removed from mutation routes      | Simplified to admin-only writes per updated business rules |

## 10. Middleware Execution Order (server.js)

1. Helmet (security headers)
2. CORS (origin validation)
3. Body parsers (JSON + urlencoded, 1MB limit)
4. Cookie parser
5. Session (connect-pg-simple, secure cookies)
6. XSS sanitizer (recursive input encoding)
7. CSRF (double-submit cookie validation)
8. Rate limiter (general API: 100/min)
9. Audit logger (state-changing requests)

## 11. Frontend Architecture

### SSR Data Flow

1. Browser requests page (e.g., `/dashboard`).
2. Next.js calls `getServerSideProps` on the server.
3. `requireAuthSSR()` validates session by calling `GET /api/v1/auth/me` with forwarded cookies.
4. If unauthenticated: returns `redirect: { destination: "/login" }`.
5. If authenticated: fetches page data (metrics, announcements, etc.) via `INTERNAL_API_URL` (Docker internal).
6. Returns `props` with `user` object and page data.
7. React renders on server, sends HTML to browser.

### API Service Layer (`services/api.js`)

Two fetch modes:
- `clientFetch(path, options)` -- Browser-side. Includes `credentials: "include"`, reads `csrf_token` cookie, sets `X-CSRF-Token` header.
- `serverFetch(path, cookie)` -- SSR-side. Forwards incoming `Cookie` header to backend via `INTERNAL_API_URL`.

Client-side 401 responses auto-redirect to `/login`.

### Component Architecture

| Component | Location                        | Purpose                           |
|-----------|---------------------------------|-----------------------------------|
| Layout    | components/Layout/Layout.js     | Shell: Header + Sidebar + Footer + mesh |
| Header    | components/Header/Header.js     | Logo, portal name, user info, logout |
| Sidebar   | components/Sidebar/Sidebar.js   | Navigation with active state, mesh accent |
| Footer    | components/Footer/Footer.js     | Copyright, version                |

### CSS Architecture

- Global tokens in `styles/globals.css` (custom properties).
- Component styles via CSS Modules (`*.module.css`).
- No external CSS frameworks (no Tailwind, Bootstrap, etc.).
- Brand palette enforced via `--color-primary`, `--color-accent`, `--color-text-muted` tokens.
- Typography: `"Lucida Grande", "Lucida Sans", "Lucida Sans Unicode", sans-serif`.
- Mesh graphic elements: CSS triangles rotated at `331.3deg` (brand-mandated angle).

### Pages Implemented

| Route        | SSR | Access   | Auth Guard       | Data Sources                       |
|--------------|-----|----------|-------------------|-------------------------------------|
| /login       | Yes | Admin    | Inverse*          | auth/me                             |
| /            | Yes | Public   | optionalAuthSSR   | announcements, systems              |
| /dashboard   | Yes | Public   | optionalAuthSSR   | metrics (grouped by category)       |
| /comunicados | Yes | Public   | optionalAuthSSR   | announcements (paginated)           |
| /documentos  | Yes | Public   | optionalAuthSSR   | documents (category filter)         |
| /equipe      | Yes | Public   | optionalAuthSSR   | team (active members)               |
| /sistemas    | Yes | Public   | optionalAuthSSR   | systems (status + category filters) |
| /chamados    | Yes | Public   | optionalAuthSSR   | None (static orientation)           |

*Login page redirects to `/` if user is already authenticated.

### Access Model: Public Read / Admin Write

**Frontend:** All content pages use `optionalAuthSSR(context)` which:
1. Reads `Cookie` header from the incoming request.
2. Calls `GET /api/v1/auth/me` via `INTERNAL_API_URL` (Docker internal network).
3. If authenticated: returns `{ user: { ... }, cookie }`.
4. If not authenticated: returns `{ user: null, cookie: "" }` (no redirect).
5. Pages render for all visitors. Admin controls (edit, delete, upload) render conditionally when `user !== null`.

**Backend:** All GET routes are public (no auth middleware). All POST/PUT/DELETE routes require `requireRole("admin")`.

**Header:** Shows "Acesso Admin" link for public visitors. Shows admin badge, user info, and logout button for authenticated admins.

## 12. Security Audit Summary (Fase 6)

Audit executed: 2026-03-30. Full report: `docs/security_audit_report.md`.

| Category                  | Checks | Passed | Failed |
|---------------------------|--------|--------|--------|
| SQL Injection Prevention  | 9      | 9      | 0      |
| XSS Protection            | 8      | 8      | 0      |
| CSRF Protection           | 5      | 5      | 0      |
| Security Headers          | 7      | 7      | 0      |
| Authentication & Session  | 8      | 8      | 0      |
| Rate Limiting             | 5      | 5      | 0      |
| Audit Logging             | 7      | 7      | 0      |
| File Upload Security      | 5      | 5      | 0      |
| RBAC                      | 10     | 10     | 0      |
| SSR & Frontend Security   | 11     | 11     | 0      |
| Database Security         | 7      | 7      | 0      |
| **Total**                 | **82** | **82** | **0**  |

**Result: 100% compliance. Zero failures.**

## 13. Project Status

All 6 phases complete. 83 files across backend, frontend, database, and documentation.

| Phase | Description                    | Status   |
|-------|--------------------------------|----------|
| 0     | Infrastructure Setup           | Complete |
| 1     | Database & Migrations          | Complete |
| 2     | Authentication & Security      | Complete |
| 3     | Backend Modules                | Complete |
| 4     | Frontend Structure & Layout    | Complete |
| 5     | Frontend Pages                 | Complete |
| 6     | Security Audit & Validation    | Complete |

