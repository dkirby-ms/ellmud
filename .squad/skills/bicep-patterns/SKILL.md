---
name: "bicep-patterns"
description: "Azure Bicep template patterns and gotchas for this project"
domain: "infrastructure"
confidence: "high"
source: "Issue #18 Bicep IaC refinement"
---

## Context

Ellmud uses Bicep IaC templates in `infra/` to deploy Azure infrastructure. These patterns were learned through compilation errors and deployment issues.

## Patterns

### Existing Resource References

`existing` resources CANNOT have `dependsOn`. If you need to reference a resource created by a module:
- Use a local variable for the name (computed from params, not module outputs)
- Add `dependsOn: [module]` to the CONSUMER resource (e.g., the role assignment), not the `existing` reference

### Role Assignment Constraints

Role assignments require `name` and `scope` to be deterministic at deployment start (compile-time). Do NOT use module outputs for these. Use locally computed variables instead:

```bicep
// ✅ Correct — deterministic at compile time
var acrName = replace('${resourcePrefix}acr', '-', '')
resource roleAssignment ... = {
  name: guid(resourceGroup().id, acrName, 'AcrPull')
  scope: existingAcr  // uses local var for name
}

// ❌ Wrong — module output is runtime only
resource roleAssignment ... = {
  name: guid(resourceGroup().id, module.outputs.name, 'AcrPull')
}
```

### Conditional Resource Creation

Use a boolean variable and `if` on the resource to conditionally create it:

```bicep
var createEnvironment = existingEnvironmentId == ''
resource env ... = if (createEnvironment) { ... }
var resolvedId = createEnvironment ? env.id : existingEnvironmentId
```

This avoids duplicate resource declarations when a module is called multiple times.

### Secret Outputs

The `listKeys()` function triggers a linter warning. Suppress with `#disable-next-line outputs-should-not-contain-secrets` when intentional (e.g., Log Analytics key for Container Apps). Phase 2 should use Key Vault references instead.

## Anti-Patterns

- **dependsOn on existing resources** — Bicep compilation error. Always invalid.
- **Module outputs in role assignment name/scope** — BCP120 error. These properties must resolve at deployment start.
- **Calling the same module twice to create + use a resource** — Creates redundant ARM declarations. Pass the existing resource ID instead.
