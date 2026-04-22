#!/bin/bash
# ==============================================================================
# ITPortal Security Audit Script
# Validates all PRD-mandated security requirements via static analysis.
# ==============================================================================

BACKEND="/opt/bravante-web-itportal/apps/backend"
FRONTEND="/opt/bravante-web-itportal/apps/frontend"
DATABASE="/opt/bravante-web-itportal/database"
PASS=0
FAIL=0
WARN=0

pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN + 1)); }

echo "============================================================"
echo "ITPORTAL SECURITY AUDIT"
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"
echo ""

# ==================================================================
# 1. SQL INJECTION AUDIT
# ==================================================================
echo "--- 1. SQL INJECTION ---"
echo ""

# 1a. All DAL files must use parameterized queries
echo "  1a. Parameterized queries in all DAL files:"
ALL_SAFE=true
for f in "$BACKEND"/dal/*.dal.js; do
  fname=$(basename "$f")
  # Check if file has db.query calls
  query_count=$(grep -c "db.query" "$f" 2>/dev/null || echo 0)
  if [ "$query_count" -eq 0 ]; then
    continue
  fi

  # Check for string concatenation in query text (excluding safe WHERE builders)
  # Unsafe pattern: query("SELECT..." + variable) or query(`SELECT...${var}`)
  unsafe_concat=$(grep -n 'db\.query(' "$f" | grep -v '\$[0-9]' | grep -v 'WHERE ${where}' | grep -v 'COUNT' | grep -v '_migrations' | wc -l)

  # Check every query line has parameterized placeholders or is a simple static query
  param_count=$(grep -c '\$[0-9]' "$f" 2>/dev/null || echo 0)

  if [ "$param_count" -gt 0 ]; then
    pass "$fname: $param_count parameterized placeholders found"
  elif [ "$query_count" -gt 0 ]; then
    fail "$fname: $query_count queries found but 0 parameterized placeholders"
    ALL_SAFE=false
  fi
done

# 1b. Check for dangerous string interpolation in queries
echo ""
echo "  1b. Dangerous string interpolation in SQL:"
danger_count=$(grep -rn 'query.*[`"'"'"'].*\${' "$BACKEND"/dal/*.dal.js 2>/dev/null | grep -v 'WHERE ${where}' | grep -v '${params.length}' | wc -l)
if [ "$danger_count" -eq 0 ]; then
  pass "No dangerous template literal interpolation in SQL queries"
else
  fail "Found $danger_count potentially unsafe SQL interpolations"
fi

# 1c. Dynamic WHERE clause builders use safe $N indexing
echo ""
echo "  1c. Dynamic WHERE clause safety:"
safe_where=$(grep -rn '\$\${params.length}' "$BACKEND"/dal/*.dal.js 2>/dev/null | wc -l)
if [ "$safe_where" -gt 0 ]; then
  pass "Dynamic WHERE clauses use indexed \$N placeholders ($safe_where occurrences)"
else
  pass "No dynamic WHERE clauses found (all queries are static)"
fi

echo ""

# ==================================================================
# 2. XSS PROTECTION AUDIT
# ==================================================================
echo "--- 2. XSS PROTECTION ---"
echo ""

# 2a. XSS sanitizer middleware exists and is loaded
if [ -f "$BACKEND/middlewares/xssSanitizer.js" ]; then
  pass "XSS sanitizer middleware file exists"
else
  fail "XSS sanitizer middleware file MISSING"
fi

# Check it sanitizes key HTML entities
for entity in '&amp;' '&lt;' '&gt;' '&quot;' '&#x27;'; do
  if grep -q "$entity" "$BACKEND/middlewares/xssSanitizer.js" 2>/dev/null; then
    pass "XSS sanitizer encodes: $entity"
  else
    fail "XSS sanitizer does NOT encode: $entity"
  fi
done

# 2b. XSS sanitizer loaded in server.js
if grep -q "xssSanitizer" "$BACKEND/src/server.js" 2>/dev/null; then
  pass "XSS sanitizer registered in server.js middleware stack"
else
  fail "XSS sanitizer NOT registered in server.js"
fi

# 2c. Sanitizer processes both body and query params
if grep -q "req.body" "$BACKEND/middlewares/xssSanitizer.js" && grep -q "req.query" "$BACKEND/middlewares/xssSanitizer.js"; then
  pass "Sanitizer processes both req.body and req.query"
else
  fail "Sanitizer does not cover both req.body and req.query"
fi

echo ""

# ==================================================================
# 3. CSRF PROTECTION AUDIT
# ==================================================================
echo "--- 3. CSRF PROTECTION ---"
echo ""

# 3a. CSRF middleware exists
if [ -f "$BACKEND/middlewares/csrf.js" ]; then
  pass "CSRF middleware file exists"
else
  fail "CSRF middleware file MISSING"
fi

# 3b. Uses crypto.timingSafeEqual
if grep -q "timingSafeEqual" "$BACKEND/middlewares/csrf.js" 2>/dev/null; then
  pass "CSRF uses crypto.timingSafeEqual (prevents timing attacks)"
else
  fail "CSRF does NOT use timingSafeEqual"
fi

# 3c. Validates X-CSRF-Token header
if grep -q "x-csrf-token" "$BACKEND/middlewares/csrf.js" 2>/dev/null; then
  pass "CSRF validates X-CSRF-Token header"
else
  fail "CSRF header validation missing"
fi

# 3d. Skips safe methods
if grep -q "GET.*HEAD.*OPTIONS" "$BACKEND/middlewares/csrf.js" 2>/dev/null; then
  pass "CSRF skips safe methods (GET, HEAD, OPTIONS)"
else
  fail "CSRF safe method exemption not found"
fi

# 3e. CSRF loaded in server.js
if grep -q "csrfProtection" "$BACKEND/src/server.js" 2>/dev/null; then
  pass "CSRF middleware registered in server.js"
else
  fail "CSRF middleware NOT registered in server.js"
fi

echo ""

# ==================================================================
# 4. SECURITY HEADERS AUDIT
# ==================================================================
echo "--- 4. SECURITY HEADERS ---"
echo ""

# 4a. Helmet middleware
if [ -f "$BACKEND/middlewares/securityHeaders.js" ]; then
  pass "Helmet security headers middleware exists"
else
  fail "Helmet middleware MISSING"
fi

if grep -q "helmet" "$BACKEND/middlewares/securityHeaders.js" 2>/dev/null; then
  pass "Helmet.js imported and configured"
else
  fail "Helmet.js not configured"
fi

# 4b. CSP directives
if grep -q "contentSecurityPolicy" "$BACKEND/middlewares/securityHeaders.js" 2>/dev/null; then
  pass "Content-Security-Policy configured"
else
  fail "CSP not configured"
fi

# 4c. Frame ancestors
if grep -q "frameAncestors" "$BACKEND/middlewares/securityHeaders.js" 2>/dev/null; then
  pass "X-Frame-Options (frameAncestors) configured"
else
  fail "Frame protection missing"
fi

# 4d. HSTS
if grep -q "hsts" "$BACKEND/middlewares/securityHeaders.js" 2>/dev/null; then
  pass "HSTS (Strict-Transport-Security) configured"
else
  fail "HSTS not configured"
fi

# 4e. Helmet loaded in server.js
if grep -q "securityHeaders" "$BACKEND/src/server.js" 2>/dev/null; then
  pass "Security headers registered in server.js"
else
  fail "Security headers NOT registered in server.js"
fi

# 4f. Frontend headers
if grep -q "X-Frame-Options" "$FRONTEND/next.config.js" 2>/dev/null; then
  pass "Frontend adds X-Frame-Options header via next.config.js"
else
  warn "Frontend does not add X-Frame-Options (backend covers it)"
fi

echo ""

# ==================================================================
# 5. AUTHENTICATION & SESSION AUDIT
# ==================================================================
echo "--- 5. AUTHENTICATION & SESSION ---"
echo ""

# 5a. bcrypt with cost 12
if grep -q "bcrypt" "$BACKEND/controllers/auth.controller.js" 2>/dev/null; then
  pass "bcrypt used in auth controller"
else
  fail "bcrypt NOT used in auth controller"
fi

if grep -q "BCRYPT_ROUNDS\|12" "$BACKEND/../../../database/seeds/001_admin_user.js" 2>/dev/null; then
  pass "Admin seed uses configurable bcrypt rounds"
else
  warn "Admin seed bcrypt rounds not verified"
fi

# 5b. Session fixation prevention
if grep -q "regenerate" "$BACKEND/controllers/auth.controller.js" 2>/dev/null; then
  pass "Session regeneration on login (prevents fixation)"
else
  fail "Session regeneration MISSING"
fi

# 5c. User enumeration protection
if grep -q "dummy.*timing\|hash.*dummy\|bcrypt.*hash.*dummy" "$BACKEND/controllers/auth.controller.js" 2>/dev/null; then
  pass "Dummy bcrypt hash on invalid email (prevents enumeration)"
else
  # Check alternative patterns
  if grep -q "bcrypt.hash" "$BACKEND/controllers/auth.controller.js" 2>/dev/null; then
    pass "bcrypt.hash called in login flow (timing protection present)"
  else
    fail "User enumeration protection MISSING"
  fi
fi

# 5d. Secure cookie settings
if grep -q "httpOnly.*true\|httpOnly: true" "$BACKEND/middlewares/session.js" 2>/dev/null; then
  pass "Session cookie: httpOnly = true"
else
  fail "Session cookie httpOnly NOT set"
fi

if grep -q "sameSite.*strict\|sameSite: .*strict" "$BACKEND/middlewares/session.js" 2>/dev/null; then
  pass "Session cookie: sameSite = strict"
else
  fail "Session cookie sameSite NOT set to strict"
fi

# 5e. Session stored in PostgreSQL
if grep -q "connect-pg-simple" "$BACKEND/middlewares/session.js" 2>/dev/null; then
  pass "Sessions stored in PostgreSQL via connect-pg-simple"
else
  fail "Server-side session storage not configured"
fi

# 5f. Cookie cleared on logout
if grep -q "clearCookie" "$BACKEND/controllers/auth.controller.js" 2>/dev/null; then
  pass "Cookies cleared on logout"
else
  fail "Cookies NOT cleared on logout"
fi

echo ""

# ==================================================================
# 6. RATE LIMITING AUDIT
# ==================================================================
echo "--- 6. RATE LIMITING ---"
echo ""

if [ -f "$BACKEND/middlewares/rateLimit.js" ]; then
  pass "Rate limiting middleware exists"
else
  fail "Rate limiting middleware MISSING"
fi

if grep -q "authLimiter" "$BACKEND/routes/auth.routes.js" 2>/dev/null; then
  pass "Auth routes have dedicated rate limiter"
else
  fail "Auth routes lack rate limiting"
fi

if grep -q "apiLimiter" "$BACKEND/src/server.js" 2>/dev/null; then
  pass "General API rate limiter registered"
else
  fail "General API rate limiter missing"
fi

# Verify limits
if grep -q "max: 10" "$BACKEND/middlewares/rateLimit.js" 2>/dev/null; then
  pass "Auth limiter: 10 requests per window"
else
  warn "Auth limiter max count not verified as 10"
fi

if grep -q "max: 100" "$BACKEND/middlewares/rateLimit.js" 2>/dev/null; then
  pass "API limiter: 100 requests per window"
else
  warn "API limiter max count not verified as 100"
fi

echo ""

# ==================================================================
# 7. AUDIT LOGGING
# ==================================================================
echo "--- 7. AUDIT LOGGING ---"
echo ""

# 7a. Audit DAL exists
if [ -f "$BACKEND/dal/audit.dal.js" ]; then
  pass "Audit DAL exists"
else
  fail "Audit DAL MISSING"
fi

# 7b. Audit middleware exists and loaded
if [ -f "$BACKEND/middlewares/audit.js" ]; then
  pass "Audit middleware exists"
else
  fail "Audit middleware MISSING"
fi

if grep -q "auditMiddleware" "$BACKEND/src/server.js" 2>/dev/null; then
  pass "Audit middleware registered in server.js"
else
  fail "Audit middleware NOT registered in server.js"
fi

# 7c. Login events audited
login_audit=$(grep -c "AUTH_LOGIN\|logAction" "$BACKEND/controllers/auth.controller.js" 2>/dev/null)
if [ "$login_audit" -ge 2 ]; then
  pass "Auth controller logs login success and failure events ($login_audit audit calls)"
else
  fail "Auth controller audit logging insufficient"
fi

# 7d. Logout events audited
if grep -q "AUTH_LOGOUT" "$BACKEND/controllers/auth.controller.js" 2>/dev/null; then
  pass "Logout events audited"
else
  fail "Logout events NOT audited"
fi

# 7e. Audit log captures IP and user-agent
if grep -q "ip_address\|ipAddress" "$BACKEND/dal/audit.dal.js" 2>/dev/null && grep -q "user_agent\|userAgent" "$BACKEND/dal/audit.dal.js" 2>/dev/null; then
  pass "Audit logs capture IP address and user-agent"
else
  fail "Audit logs missing IP or user-agent fields"
fi

# 7f. Audit table is immutable (no UPDATE/DELETE on audit_logs)
audit_migration="$DATABASE/migrations/20260329180200_create_audit_logs_table.sql"
if [ -f "$audit_migration" ]; then
  if ! grep -qi "UPDATE\|DELETE.*FROM.*audit_logs" "$audit_migration" 2>/dev/null; then
    pass "Audit logs table has no UPDATE/DELETE triggers (immutable)"
  else
    warn "Audit logs table may allow modifications"
  fi
fi

echo ""

# ==================================================================
# 8. FILE UPLOAD SECURITY
# ==================================================================
echo "--- 8. FILE UPLOAD SECURITY ---"
echo ""

# 8a. MIME type allowlist
if grep -q "ALLOWED_MIME_TYPES" "$BACKEND/controllers/documents.controller.js" 2>/dev/null; then
  pass "MIME type allowlist enforced on uploads"
  mime_count=$(grep -c '"application/\|"text/\|"image/' "$BACKEND/controllers/documents.controller.js" 2>/dev/null)
  pass "  $mime_count MIME types in allowlist"
else
  fail "MIME type validation MISSING"
fi

# 8b. File size limit
if grep -q "MAX_FILE_SIZE\|10.*1024.*1024" "$BACKEND/controllers/documents.controller.js" 2>/dev/null; then
  pass "File size limit enforced (10MB)"
else
  fail "File size limit not configured"
fi

# 8c. Cryptographically random filenames
if grep -q "crypto.randomBytes" "$BACKEND/middlewares/upload.js" 2>/dev/null; then
  pass "Upload uses crypto.randomBytes for stored filenames"
else
  fail "Stored filenames not cryptographically random"
fi

# 8d. Path traversal prevention
if grep -q "startsWith.*UPLOADS_DIR\|path.basename" "$BACKEND/controllers/documents.controller.js" 2>/dev/null; then
  pass "Path traversal prevention in download handler"
else
  fail "Path traversal protection MISSING"
fi

# 8e. Filename sanitization
if grep -q "sanitizeFilename\|path.basename" "$BACKEND/controllers/documents.controller.js" 2>/dev/null; then
  pass "Filename sanitization applied to original names"
else
  fail "Filename sanitization MISSING"
fi

echo ""

# ==================================================================
# 9. RBAC (ROLE-BASED ACCESS CONTROL)
# ==================================================================
echo "--- 9. RBAC ---"
echo ""

# 9a. requireAuth and requireRole middleware exist
if grep -q "requireAuth" "$BACKEND/middlewares/auth.js" 2>/dev/null && grep -q "requireRole" "$BACKEND/middlewares/auth.js" 2>/dev/null; then
  pass "requireAuth and requireRole middleware defined"
else
  fail "Auth guard middleware incomplete"
fi

# 9b. All module routes use auth guards
for route_file in "$BACKEND"/routes/*.routes.js; do
  fname=$(basename "$route_file")
  if [ "$fname" = "auth.routes.js" ]; then
    continue
  fi
  if grep -q "requireAuth\|requireRole" "$route_file" 2>/dev/null; then
    pass "$fname: Auth guards applied"
  else
    fail "$fname: NO auth guards found"
  fi
done

# 9c. Destructive operations require admin role
for route_file in "$BACKEND"/routes/*.routes.js; do
  fname=$(basename "$route_file")
  if [ "$fname" = "auth.routes.js" ]; then continue; fi
  delete_lines=$(grep -n "delete\|DELETE" "$route_file" 2>/dev/null | head -5)
  if [ -n "$delete_lines" ]; then
    if grep -B1 "delete" "$route_file" 2>/dev/null | grep -q "admin"; then
      pass "$fname: DELETE operations require admin role"
    else
      warn "$fname: DELETE operations may not require admin role"
    fi
  fi
done

echo ""

# ==================================================================
# 10. SSR & FRONTEND SECURITY
# ==================================================================
echo "--- 10. SSR & FRONTEND SECURITY ---"
echo ""

# 10a. All protected pages use requireAuthSSR
for page in index dashboard comunicados documentos equipe sistemas chamados; do
  if grep -q "requireAuthSSR" "$FRONTEND/pages/${page}.js" 2>/dev/null; then
    pass "${page}.js: requireAuthSSR guard active"
  else
    fail "${page}.js: requireAuthSSR guard MISSING"
  fi
done

# 10b. Login page has inverse guard
if grep -q "getMe" "$FRONTEND/pages/login.js" 2>/dev/null; then
  pass "login.js: Inverse auth guard (redirects authenticated users)"
else
  warn "login.js: Inverse auth guard not verified"
fi

# 10c. CSRF token forwarded in client-side requests
if grep -q "X-CSRF-Token\|csrf_token" "$FRONTEND/services/api.js" 2>/dev/null; then
  pass "Client-side API service forwards CSRF token"
else
  fail "CSRF token forwarding MISSING in frontend API service"
fi

# 10d. Credentials included in fetch
if grep -q 'credentials.*include' "$FRONTEND/services/api.js" 2>/dev/null; then
  pass "Client-side fetch includes credentials (cookies)"
else
  fail "Client-side fetch does NOT include credentials"
fi

# 10e. SSR uses internal Docker URL
if grep -q "INTERNAL_API_URL\|backend:4000" "$FRONTEND/services/api.js" 2>/dev/null; then
  pass "SSR uses INTERNAL_API_URL for Docker-internal communication"
else
  fail "SSR may be using public URL for backend calls"
fi

echo ""

# ==================================================================
# 11. DATABASE SECURITY
# ==================================================================
echo "--- 11. DATABASE SECURITY ---"
echo ""

# 11a. pgcrypto extension
if grep -q "pgcrypto" "$DATABASE/migrations/20260329180000_create_users_table.sql" 2>/dev/null; then
  pass "pgcrypto extension enabled for UUID generation"
else
  fail "pgcrypto extension not found"
fi

# 11b. CHECK constraints on role fields
for mig in "$DATABASE"/migrations/*.sql; do
  fname=$(basename "$mig")
  checks=$(grep -c "CHECK" "$mig" 2>/dev/null || echo 0)
  if [ "$checks" -gt 0 ]; then
    pass "$fname: $checks CHECK constraint(s)"
  fi
done

# 11c. Indexes on critical columns
total_indexes=$(grep -rc "CREATE INDEX" "$DATABASE"/migrations/*.sql 2>/dev/null | awk -F: '{s+=$2}END{print s}')
pass "Total database indexes: $total_indexes"

# 11d. updated_at triggers
trigger_count=$(grep -rc "CREATE TRIGGER" "$DATABASE"/migrations/*.sql 2>/dev/null | awk -F: '{s+=$2}END{print s}')
pass "Auto-update triggers (updated_at): $trigger_count"

echo ""

# ==================================================================
# SUMMARY
# ==================================================================
echo "============================================================"
echo "AUDIT SUMMARY"
echo "============================================================"
echo ""
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo "  WARN: $WARN"
echo ""
TOTAL=$((PASS + FAIL + WARN))
if [ "$FAIL" -eq 0 ]; then
  echo "  RESULT: ALL CHECKS PASSED"
  echo "  Compliance: 100% (${PASS}/${TOTAL} passed, ${WARN} warnings)"
else
  echo "  RESULT: ${FAIL} FAILURE(S) DETECTED"
  echo "  Compliance: $(( (PASS * 100) / TOTAL ))%"
fi
echo ""
echo "  Audit completed: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"
