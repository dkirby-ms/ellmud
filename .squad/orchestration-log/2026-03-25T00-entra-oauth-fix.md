# Orchestration Report: Entra OAuth Fix

**Date:** 2026-03-25T00:00:00Z  
**Event:** Team deployment of Entra OAuth fixes  
**Status:** Complete  
**Commit:** e59ca32 pushed to origin/dev

---

## Agents Involved

### Drizzt (Engine Dev)
**Role:** Fix 5 Entra OAuth bugs  
**Output Mode:** Background  
**Fixes Applied:**
1. Added `dotenv` dependency and loader — .env now loads from monorepo root at server startup
2. Fixed redirect URI path from `/auth/callback` → `/auth/entra/callback` in `.env.example` and `index.ts` defaults
3. Corrected openid-client v6 API call — `discovery()` 3rd arg is `clientSecret`, not `redirectUri`
4. Fixed CIAM issuer URL — added `ENTRA_TENANT_SUBDOMAIN` env var, URL now uses subdomain name not GUID
5. Wired Entra params through `main.bicep` to container-apps module

**Outcome:** All fixes applied and committed

### Minsc (Tester)
**Role:** Write 30 Entra auth tests  
**Output Mode:** Background  
**Tests Written:**
- Login redirect handling (Entra disabled/enabled paths)
- Callback handling with state verification
- Session creation post-auth
- Edge cases (missing state, invalid code, PKCE)
- Disabled-Entra fallback behavior

**Outcome:** 30/30 tests pass (100% pass rate)

### Coordinator
**Role:** Fix test type errors and documentation  
**Output Mode:** Sync (inline)  
**Fixes Applied:**
1. Fixed 4 test type errors — added `tenantSubdomain` to EntraConfig fixtures in `entra-auth.test.ts`
2. Updated `.env.example` to reference `ciamlogin.com` (new CIAM domain) instead of old `onmicrosoft.com`
3. Updated UAT checklist (drizzt-entra-uat-checklist.md) to reflect `ciamlogin.com` domain and new `ENTRA_TENANT_SUBDOMAIN` requirement

**Outcome:** All type errors resolved, docs aligned with code

---

## Files Changed

| File | Changes |
|------|---------|
| `.env.example` | CIAM domain references, new `ENTRA_TENANT_SUBDOMAIN` var |
| `packages/server/src/auth/EntraAuthService.ts` | (Engine dev fixes applied) |
| `packages/server/src/index.ts` | Redirect URI path, dotenv loader |
| `packages/server/package.json` | Added `dotenv` dependency |
| `package-lock.json` | Updated lock file |
| `infra/main.bicep` | Added Entra param wiring |
| `infra/modules/container-apps.bicep` | Entra params passed through |
| `packages/server/src/__tests__/entra-auth.test.ts` | 30 new tests + type fixes |

---

## Test Results

**Test Suite:** `packages/server/src/__tests__/entra-auth.test.ts`  
**Total Tests:** 30  
**Passed:** 30 (100%)  
**Failed:** 0  
**Duration:** Standard (no timeout issues)

---

## Deployment Readiness

✅ All code fixes deployed  
✅ All tests passing  
✅ UAT checklist available (drizzt-entra-uat-checklist.md)  
✅ Environment variables documented

**Next Steps:**
1. Deploy to UAT with Entra app registration credentials
2. Verify redirect URI matches app registration settings in Entra admin center
3. Test full OAuth flow: login → Entra redirect → callback → session creation

---

## Decision: Entra Scope Confirmed

**Captured:** 2026-03-24T22:19:00Z  
Entra External ID is ONLY for user login authentication. We are NOT protecting specific APIs with Entra. All granular role assignments are managed in our own user DB in Postgres.
