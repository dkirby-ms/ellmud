# Decision: Schema defineTypes over decorators

**Date:** 2026-03-19
**By:** Drizzt (Engine Dev)
**Scope:** All Colyseus Schema definitions in the server package

## Decision
Use `defineTypes(MyClass, { field: 'type' })` programmatic API for all Colyseus Schema definitions instead of `@type()` decorators.

## Why
- `@colyseus/schema` v4.0.x's `@type()` decorator uses the legacy `PropertyDecorator` signature (target = prototype, field = string name)
- TypeScript 5.9.3 (required by schema v4 peer dependency) defaults to native TC39 Stage 3 decorators, which pass different arguments
- `experimentalDecorators: true` may conflict or be ignored by runtime transpilers (tsx, esbuild)
- `defineTypes()` is stable, explicit, and works regardless of decorator implementation

## Impact
- All team members creating Schema classes must use `defineTypes()` pattern
- Example in `packages/server/src/state.ts`
- No `experimentalDecorators` or `emitDecoratorMetadata` needed in tsconfig
