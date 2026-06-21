# Khelben decision: undici audit finding via @semantic-release/npm

Date: 2026-06-20
Author: Khelben (CI/CD Dev)

## Finding

The remaining full `npm audit` high vulnerability is `undici <=6.26.0` at:

`ellmud -> @semantic-release/npm@13.1.5 -> npm@11.17.0 -> node-gyp@12.4.0 -> undici@6.26.0`

`@semantic-release/npm` is declared in the root `package.json` under `devDependencies`, not as a runtime dependency or workspace dependency. This is release/CI tooling and is omitted by `npm audit --omit=dev`, so it does not ship in the production dependency set.

## Remediation evaluated

1. Checked upstream `@semantic-release/npm` versions and dist-tags. Latest is `13.1.5`; no newer stable version exists that pulls an npm package with patched bundled `undici`.
2. Checked npm package dist-tags. Latest npm is `11.17.0`, which is already resolved locally.
3. Tried a root `overrides.undici = 6.27.0`. It updated normal resolvable `undici` copies but did not reach `node_modules/npm/node_modules/undici@6.26.0` because that copy is bundled inside npm. Full audit still reported the same finding, so the override was removed.

## Decision

Accept this as a dev-only/release-tooling risk until upstream npm / @semantic-release/npm ships a package with bundled `undici >6.26.0`.

CI was changed to keep the full high-severity audit visible as informational, then gate on the production dependency set with:

`npm audit --omit=dev --audit-level=high`

## Validation

- `npm ls undici --all --depth=6` still shows the vulnerable copy only under `@semantic-release/npm -> npm -> node-gyp -> undici@6.26.0`.
- Full `npm audit --audit-level=high`: 1 high vulnerability.
- Production `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
