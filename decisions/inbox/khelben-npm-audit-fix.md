# Khelben npm audit remediation

Date: 2026-06-20T14:23:18Z

## Decisions

- Avoided `npm audit fix --force`; all project-controlled fixes were available within the current major versions.
- Bumped workspace-declared ranges to patched minimums:
  - `react-router` to `^7.15.1`
  - `vite` to `^6.4.3`
  - `vitest` and `@vitest/coverage-v8` to `^3.2.6`
  - `express` to `^4.22.2`
  - `tsx` to `^4.22.0` so its `esbuild` dependency resolves to the patched `0.28.1` line
- Added root overrides for project transitive/peer-hoisted vulnerable packages that direct workspace bumps alone did not fully replace:
  - `express: 4.22.2`
  - `qs: 6.15.2`
  - `vite: 6.4.3`
  - `tsx: 4.22.0`
- Did not override `undici` under `node_modules/npm/node_modules/undici`; it is bundled inside the `npm` package used by `@semantic-release/npm`, and npm reports bundled dependencies cannot be fixed automatically. It should clear only when the npm package itself ships a patched bundled `undici`.

## Verification

- Before: `npm audit` reported 8 vulnerabilities: 1 low, 2 moderate, 3 high, 2 critical.
- After: `npm audit` reports 1 high vulnerability, only bundled `npm`/`undici`.
- `npm ls vite vitest @vitest/coverage-v8 react-router express qs esbuild tsx undici --all --workspaces --if-present` is clean for project-controlled packages.
- `npm run build` succeeded after removing an overly broad global `esbuild` override.
- `npm test` and `npm run test:ci` were attempted but stopped after several minutes with no output; build and dependency tree verification completed.
