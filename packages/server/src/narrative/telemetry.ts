/**
 * Narration Telemetry — in-memory counters and histograms.
 *
 * Tracks cache hit ratio, LLM latency distribution, and fallback rate.
 * No external dependencies — just accumulate and report.
 */

import type { NarrationTelemetry } from '@ellmud/shared';

const MAX_LATENCY_SAMPLES = 1000;

export class NarrationTelemetryTracker {
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _llmCalls = 0;
  private _llmTimeouts = 0;
  private _fallbackUses = 0;
  private _llmLatencies: number[] = [];

  recordCacheHit(): void {
    this._cacheHits++;
  }

  recordCacheMiss(): void {
    this._cacheMisses++;
  }

  recordLlmCall(latencyMs: number): void {
    this._llmCalls++;
    this._llmLatencies.push(latencyMs);
    if (this._llmLatencies.length > MAX_LATENCY_SAMPLES) {
      this._llmLatencies.shift();
    }
  }

  recordLlmTimeout(): void {
    this._llmTimeouts++;
  }

  recordFallbackUse(): void {
    this._fallbackUses++;
  }

  getTelemetry(): NarrationTelemetry {
    const totalLookups = this._cacheHits + this._cacheMisses;
    const totalResponses = this._llmCalls + this._fallbackUses;
    const avgLatency =
      this._llmLatencies.length > 0
        ? this._llmLatencies.reduce((a, b) => a + b, 0) / this._llmLatencies.length
        : 0;

    return {
      cache_hits: this._cacheHits,
      cache_misses: this._cacheMisses,
      llm_calls: this._llmCalls,
      llm_timeouts: this._llmTimeouts,
      fallback_uses: this._fallbackUses,
      llm_latencies: [...this._llmLatencies],
      avg_llm_latency_ms: Math.round(avgLatency * 100) / 100,
      cache_hit_ratio: totalLookups > 0 ? this._cacheHits / totalLookups : 0,
      fallback_rate: totalResponses > 0 ? this._fallbackUses / totalResponses : 0,
    };
  }

  reset(): void {
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._llmCalls = 0;
    this._llmTimeouts = 0;
    this._fallbackUses = 0;
    this._llmLatencies = [];
  }
}
