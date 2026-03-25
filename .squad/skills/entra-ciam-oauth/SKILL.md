# SKILL: Entra External ID (CIAM) OIDC Integration

## When to Use
Integrating Microsoft Entra External ID as an identity provider using openid-client v6.

## Key Patterns

### 1. CIAM Issuer URL
Entra External ID uses `ciamlogin.com`, **NOT** the standard `login.microsoftonline.com`:
```
https://{TENANT_SUBDOMAIN}.ciamlogin.com/{TENANT_ID}/v2.0
```
- `TENANT_SUBDOMAIN` = the tenant's custom domain name (e.g. `ellmud`), **not** the GUID
- `TENANT_ID` = the directory (tenant) GUID — used in the path only
- Common mistake: using the GUID as the subdomain → DNS resolution fails

### 2. openid-client v6 `discovery()` API
```ts
const config = await client.discovery(
  issuerUrl,           // URL — the OIDC issuer
  clientId,            // string — application client ID
  clientSecret,        // string | Partial<ClientMetadata> — when string, treated as client_secret
  ClientSecretPost(clientSecret), // ClientAuth — authentication method
);
```
- 3rd arg as string = `client_secret` (NOT redirect URI!)
- Common mistake: passing `redirectUri` as 3rd arg → stored as client_secret, auth silently breaks

### 3. Redirect URI Consistency
The redirect URI must match in **all three places**:
1. Entra app registration → Authentication → Redirect URIs
2. Server route path (e.g. `/auth/entra/callback`)
3. `ENTRA_REDIRECT_URI` env var

### 4. Env Var Loading in Monorepo
Node.js servers in monorepo packages need explicit `.env` loading since they don't have Vite's auto-loading:
```ts
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
```

## Anti-Patterns
- Using tenant GUID as ciamlogin.com subdomain
- Passing redirect URI where client_secret is expected
- Assuming `.env` vars load automatically without dotenv or `--env-file`
- Forgetting to wire Bicep params from orchestrator to module
