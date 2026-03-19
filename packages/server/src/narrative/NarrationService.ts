/**
 * NarrationService — the main entry point for the narration pipeline.
 *
 * Pipeline: hash state → check cache → LLM or fallback → return prose.
 *
 * The LLM is NEVER on the hot path. If cache miss AND LLM slow,
 * return template immediately. LLM continues in background to enrich cache.
 */

import type {
  NarrationContext,
  NarrationConfig,
  LLMNarrationType,
} from '@ellmud/shared';
import { DEFAULT_NARRATION_CONFIG } from '@ellmud/shared';
import { hashState } from './hasher.js';
import type { NarrationCache } from './cache.js';
import { InMemoryNarrationCache } from './cache.js';
import { LLMClient } from './llm-client.js';
import { renderTemplate } from './templates.js';
import { NarrationTelemetryTracker } from './telemetry.js';

export interface NarrationServiceDeps {
  cache?: NarrationCache;
  llmClient?: LLMClient;
  config?: NarrationConfig;
}

export class NarrationService {
  private readonly cache: NarrationCache;
  private readonly llmClient: LLMClient | null;
  private readonly config: NarrationConfig;
  readonly telemetry: NarrationTelemetryTracker;

  constructor(deps: NarrationServiceDeps = {}) {
    this.cache = deps.cache ?? new InMemoryNarrationCache();
    this.llmClient = deps.llmClient ?? null;
    this.config = deps.config ?? DEFAULT_NARRATION_CONFIG;
    this.telemetry = new NarrationTelemetryTracker();
  }

  /**
   * Main narration entry point.
   *
   * 1. Hash the state snapshot
   * 2. Check cache — hit → return immediately
   * 3. Cache miss → race LLM against timeout
   * 4. LLM wins → validate, cache, return
   * 5. Timeout wins → return template, fire background LLM enrichment
   */
  async narrate(context: NarrationContext): Promise<string> {
    const cacheKey = hashState(context);
    const ttl = this.getCacheTTL(context.narration_type);

    // Step 1: Cache lookup
    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      this.telemetry.recordCacheHit();
      return cached;
    }
    this.telemetry.recordCacheMiss();

    // Step 2: If no LLM client, go straight to template
    if (!this.llmClient) {
      const fallback = renderTemplate(context.narration_type, context);
      this.telemetry.recordFallbackUse();
      await this.cache.set(cacheKey, fallback, ttl);
      return fallback;
    }

    // Step 3: Race LLM against timeout
    const timeoutMs = this.getTimeout(context.narration_type);
    const result = await this.raceLLM(context, timeoutMs);

    if (result.source === 'llm' && result.text) {
      // LLM responded in time with valid output
      await this.cache.set(cacheKey, result.text, ttl);
      return result.text;
    }

    // Step 4: Timeout or invalid LLM output — use template
    const fallback = renderTemplate(context.narration_type, context);
    this.telemetry.recordFallbackUse();
    await this.cache.set(cacheKey, fallback, ttl);

    // Step 5: Fire background enrichment if LLM timed out (not rejected)
    if (result.source === 'timeout') {
      this.backgroundEnrich(context, cacheKey, ttl);
    }

    return fallback;
  }

  /**
   * Race the LLM call against a timeout.
   * Returns the winner.
   */
  private async raceLLM(
    context: NarrationContext,
    timeoutMs: number,
  ): Promise<{ source: 'llm' | 'timeout' | 'rejected'; text: string | null }> {
    const controller = new AbortController();
    const modelConfig = this.config.model[context.narration_type];
    const startTime = Date.now();

    const llmPromise = this.llmClient!.generate(context, modelConfig, controller.signal)
      .then((result) => {
        const latency = Date.now() - startTime;
        this.telemetry.recordLlmCall(latency);

        if (result.rejected) {
          return { source: 'rejected' as const, text: null };
        }
        return { source: 'llm' as const, text: result.text };
      })
      .catch(() => {
        return { source: 'timeout' as const, text: null };
      });

    const timeoutPromise = new Promise<{ source: 'timeout'; text: null }>((resolve) => {
      setTimeout(() => {
        controller.abort();
        this.telemetry.recordLlmTimeout();
        resolve({ source: 'timeout', text: null });
      }, timeoutMs);
    });

    return Promise.race([llmPromise, timeoutPromise]);
  }

  /**
   * Fire-and-forget background LLM call to enrich cache.
   * The result of the LLM call replaces the template in cache.
   */
  private backgroundEnrich(
    context: NarrationContext,
    cacheKey: string,
    ttl: number,
  ): void {
    if (!this.llmClient) return;

    const hardLimit = this.config.timeouts.hard_limit;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), hardLimit);
    const modelConfig = this.config.model[context.narration_type];

    this.llmClient
      .generate(context, modelConfig, controller.signal)
      .then(async (result) => {
        clearTimeout(timeout);
        if (!result.rejected && result.text) {
          await this.cache.set(cacheKey, result.text, ttl);
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        // Background enrichment failure is silent — template is already served
      });
  }

  /** Get timeout budget for a narration type (GDD §4.5). */
  private getTimeout(type: LLMNarrationType): number {
    if (type === 'combat_action' || type === 'combat_round') {
      return this.config.timeouts.combat_action;
    }
    return this.config.timeouts.room_description;
  }

  /** Get cache TTL for a narration type. */
  private getCacheTTL(type: LLMNarrationType): number {
    if (type === 'combat_action' || type === 'combat_round') {
      return this.config.cache_ttl.combat;
    }
    return this.config.cache_ttl.exploration;
  }
}
