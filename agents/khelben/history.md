- 2026-06-20T13:59:31Z: Adopted resource group pattern `RESOURCE_GROUP="${1:-${RESOURCE_GROUP:-rg-ellmud}}"` so infra scripts read `RESOURCE_GROUP` with generic fallback `rg-ellmud`.


## 2026-06-21T16:08:38Z — LLM issues filed and UAT promotion PR

Khelben filed LLM narration issues #509–#522 with labels and milestones, then opened PR #523 to repair scheduled UAT promotion by removing the invalid empty schedule block and restoring explicit ci-cd.yml dispatch with the promoted SHA.
