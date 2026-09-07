# AgriFlow — Security & Testing Notes

A review against the security checklist from the project spec, done
honestly — items that aren't fully addressed are marked as such
rather than glossed over.

## Security checklist

| Item | Status | Notes |
|---|---|---|
| Password hashing | ✅ | bcrypt via passlib (`app/core/security.py`). Plaintext passwords are never stored or logged. |
| JWT authentication | ✅ | HS256, signed with `SECRET_KEY`, 24h expiry (`app/core/security.py`). |
| Input validation | ✅ | Every request body is a Pydantic schema with field constraints (`min_length`, `gt=0`, etc). |
| Environment variables | ✅ | `SECRET_KEY`, `DATABASE_URL`, `ANTHROPIC_API_KEY` all read from `.env`, never hardcoded. `.env` is gitignored; `.env.example` must stay secret-free (see the credential-leak check below). |
| CORS configuration | ✅ | Restricted to `CORS_ORIGINS` from `.env`, not a wildcard `*`. |
| API error handling | ✅ | FastAPI's default exception handling returns structured JSON; unhandled exceptions aren't shown to the client with a stack trace. |
| No API keys in frontend | ✅ | The only external API call (Claude) happens entirely in the backend (`app/services/assistant.py`) — the frontend never receives `ANTHROPIC_API_KEY`. |
| No hardcoded credentials | ✅ | Verified by a project-wide grep for secret-shaped strings (see below) — none found. |
| Appropriate authorization | ✅ | Every produce/recommendation/buyer-matching/transaction/processing route checks `farmer_id` ownership, not just "is logged in" — see `_get_owned_produce()` in `routers/produce.py` and the equivalent checks in `routers/recommendations.py`, `routers/buyers.py`, `routers/transactions.py`, `routers/processing.py`. |
| SQL injection protection | ✅ | Every query goes through SQLAlchemy's ORM/query builder — no raw string-interpolated SQL anywhere. |
| Rate limiting | ⚠️ Not implemented | Reasonable to skip for a hackathon MVP; would matter before any real production deployment. |
| HTTPS / TLS | ✅ once deployed | Local dev is plain HTTP, which is normal for `localhost`. The selected hosting provider must provision TLS before production use. |
| Password strength rules | ⚠️ Minimal | Only a 6-character minimum (`schemas/user.py`) — no complexity requirement. Fine for a demo, worth strengthening later. |

## Manual credential-leak check

Run this before ever pushing to a public repo:

```powershell
Select-String -Path backend\.env.example -Pattern "sk-ant|sk-proj"
```

If that prints a match, a real key has ended up in the template file
and needs to move to `backend\.env` instead — see the Step 10 notes
for exactly this situation, which happened once already in this project.

## Running the automated backend tests

```powershell
cd backend
pip install -r requirements-dev.txt
pytest
```

Tests run against an isolated in-memory database — they never touch
`agriflow.db`, and recommendation/market tests seed their own demo
data, so nothing needs to be set up manually first.

Covers:
- **Authentication** — registration, duplicate-email rejection, login success/failure, protected routes with a missing token (403), an invalid token (401), and a valid one (200, password never included in the response)
- **Produce CRUD** — create/list/update/delete, non-positive quantity rejected, and cross-farmer ownership isolation (farmer B gets 404 on farmer A's produce, not 403 — so existence isn't leaked either)
- **Recommendation engine** — Tomato gets all 4 options, Wheat gets only SELL_NOW/STORE (no processor or matching buyer for it in the demo data), an oversized quantity correctly excludes ALT_BUYER, every score and risk value is bounded 0–100, and unowned produce is 404
- **Market comparison** — trend data structurally valid, crop list includes the seeded crops, an empty (unseeded) database returns `[]` rather than erroring

## Manual QA checklist (forms, responsiveness, error states)

Automated frontend tests weren't added, to keep the stack simple for
a hackathon timeline — this covers the same ground by hand.

**Forms**
- [ ] Register with a field left blank → readable error, not a blank failure
- [ ] Register with a duplicate email → "already exists" message, no crash
- [ ] Add Produce with quantity 0 → rejected (try via `/docs` if the dropdown/number input blocks it client-side first)
- [ ] Login with the wrong password → visible error, not a silent failure

**Responsive UI**
- [ ] Open the app at a narrow viewport (browser DevTools device toolbar, or an actual phone) — the nav wraps instead of overflowing off-screen
- [ ] Dashboard summary cards go to 2 columns on mobile, 3 on desktop
- [ ] Login, Register, and Add Produce forms are all usable one-handed at phone width

**Error handling**
- [ ] Stop the backend, open any data-fetching page → a message appears, not a blank crash
- [ ] Visit a produce or buyer id that doesn't exist, or belongs to another farmer → 404, never a raw stack trace
- [ ] Let a session go stale (or lower `ACCESS_TOKEN_EXPIRE_MINUTES` temporarily for testing) → the app redirects to login instead of showing broken/partial data
