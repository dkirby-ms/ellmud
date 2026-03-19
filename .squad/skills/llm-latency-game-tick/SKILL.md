---
name: "llm-latency-game-tick"
description: "Pattern for integrating LLM generation into real-time game loops where LLM latency exceeds tick budgets"
domain: "game-architecture, llm-integration"
confidence: "high"
source: "earned — Azure architecture analysis for Shardbound (2026-03-19)"
---

## Context

When a real-time game (tick-based or frame-based) needs LLM-generated content (narration, dialogue, descriptions), the LLM's time-to-first-token (TTFT) almost always exceeds the tick budget. For example:
- GPT-4o-mini TTFT: ~1.75s median
- Combat tick budget: 200ms-1s
- Even the fastest models can't reliably hit sub-200ms for generated prose

This means the LLM **cannot be on the game's hot path**. It must be treated as an asynchronous enrichment layer, not a synchronous dependency.

## Patterns

### 1. Cache-First, Generate-Second
- Hash the deterministic input state (SHA-256 of the structured state snapshot)
- Check a fast key-value store (Redis) before calling the LLM
- On cache miss: serve template fallback immediately, queue LLM generation in background
- On LLM response: cache the result for future identical states

### 2. Pre-Generation
- When a player enters room N, speculatively generate descriptions for adjacent rooms (N±1)
- During shard seeding (before players enter), pre-generate common combat narration patterns
- Use the LLM batch API (50% discount on Azure AI Foundry) for bulk pre-generation

### 3. Tiered Timeout with Fallback
```
Latency tiers:
  Combat narration: 200ms soft / 800ms hard → template fallback
  Room description: 1s soft / 2s hard → template fallback
  Ambient/trace:    2s soft / 3s hard → template fallback
```
Template fallback is not degraded mode — it IS the guaranteed mode. LLM prose is the enhancement.

### 4. Async Message Delivery
- The game tick resolves mechanically (deterministic, no LLM dependency)
- Narration is delivered via `client.send()` as soon as available — may arrive after the tick that triggered it
- The text medium is forgiving: a 500ms delay between "You attack" (template) and a richer description is acceptable in a MUD

## Examples

```typescript
async function narrateCombatResult(state: CombatSnapshot, client: Client) {
  const cacheKey = hashState(state);
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    client.send("narrate", { text: cached });
    return;
  }
  
  // Template fallback fires immediately
  client.send("narrate", { text: renderTemplate("combat", state) });
  
  // LLM enrichment happens in background — cached for next time
  generateAsync(state).then(prose => {
    redis.set(cacheKey, prose, "EX", 3600);
    // Note: we do NOT re-send to the client. The template was good enough.
    // The LLM prose will serve the NEXT player who triggers this same state.
  });
}
```

## Anti-Patterns

1. **Awaiting LLM on the tick path.** Never `await llm.generate()` inside the tick loop. The tick must resolve in <1s regardless.
2. **Treating template fallback as "degraded mode."** Templates are the baseline. LLM is the bonus. If you design assuming LLM always works, you've built a fragile system.
3. **Invalidating cache on every minor state variation.** Hash only the fields that affect narration output (creature type, action, result), not ephemeral fields (exact HP percentage, tick number). Otherwise cache hit rates collapse.
4. **Single timeout for all narration types.** Combat needs sub-second; room descriptions can tolerate 2s. Use tiered budgets.
