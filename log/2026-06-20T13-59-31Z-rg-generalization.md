# Resource Group Generalization Session

At 2026-06-20T13:59:31Z, khelben generalized infrastructure resource group handling. The implementation reads from `RESOURCE_GROUP` with the generic fallback `rg-ellmud` using `RESOURCE_GROUP="${1:-${RESOURCE_GROUP:-rg-ellmud}}"`, updated infra and deployment docs, and verified no `rg-ellmud`/`rg-ellmud` literals remain.
