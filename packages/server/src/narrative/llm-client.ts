/**
 * LLM Client — wraps Azure AI Foundry GPT-4o-mini for narration.
 *
 * Enforces timeout via AbortController, validates output contract (GDD §4.4),
 * and constructs structured prompts from NarrationContext.
 *
 * Designed for dependency injection: all external services are mockable.
 */

import type { NarrationContext, NarrationModelConfig } from '@ellmud/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The shape of a chat completion request sent to Azure AI Foundry. */
export interface LLMRequest {
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  max_tokens: number;
  temperature: number;
}

/** Minimal response shape from the Azure completions endpoint. */
export interface LLMResponse {
  choices: Array<{ message: { content: string } }>;
}

/**
 * Transport function — performs the actual HTTP call.
 * Injected to allow mocking in tests.
 */
export type LLMTransport = (
  request: LLMRequest,
  signal: AbortSignal,
) => Promise<LLMResponse>;

/** Configuration for the LLM client. */
export interface LLMClientConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

// ─── Output Validation (GDD §4.4) ───────────────────────────────────────────

/**
 * Patterns that indicate the LLM violated the output contract.
 * If any match, the response is rejected.
 */
const FORBIDDEN_PATTERNS = [
  /\b\d+\s*(?:HP|hp|Hp|damage|dmg|hit points)\b/,
  /\b(?:damage|heal|health|mana):\s*\d+/i,
  /\b\d+%/,
  /\b\d+\s*(?:gold|coins|XP|experience)\b/i,
  /\b(?:level|lvl)\s*\d+/i,
];

/** Schema keywords that should never appear in narrated prose. */
const SCHEMA_KEYWORDS = [
  'hp_pct',
  'shard_stability',
  'awareness_level',
  'light_level',
  'disposition',
  'narration_type',
  'narrative_directives',
];

/**
 * Validate LLM output against the GDD §4.4 contract.
 * Returns null if valid, or a reason string if rejected.
 */
export function validateLLMOutput(
  text: string,
  context: NarrationContext,
): string | null {
  // Check for mechanical numbers
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      return `Contains forbidden mechanical pattern: ${pattern.source}`;
    }
  }

  // Check for Schema keywords
  for (const keyword of SCHEMA_KEYWORDS) {
    if (text.toLowerCase().includes(keyword)) {
      return `Contains Schema keyword: ${keyword}`;
    }
  }

  // Enforce narrative_directives.forbidden array (GDD §4.4)
  const lower = text.toLowerCase();
  for (const directive of context.narrative_directives.forbidden) {
    if (directive === 'reveal_player_names') {
      // Player names are never sent to the LLM, but defense-in-depth:
      // reject output that looks like it names a specific player character
      if (/\bplayer\s*\d+\b/i.test(text) || /\b(?:Player|CHARACTER):\s*\w+/i.test(text)) {
        return 'Contains player name reference (reveal_player_names forbidden)';
      }
    }
    if (directive === 'reveal_hidden_items') {
      if (lower.includes('hidden') && lower.includes('item')) {
        return 'References hidden items (reveal_hidden_items forbidden)';
      }
    }
    if (directive === 'invent_entities') {
      // Covered by system prompt; can't reliably validate without NLP
    }
    if (directive === 'resolve_mechanics') {
      if (/\b(?:roll|dice|saving throw|ability check)\b/i.test(text)) {
        return 'Contains mechanical resolution language (resolve_mechanics forbidden)';
      }
    }
  }

  return null;
}

// ─── Prompt Construction ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the narrative voice of a dark fantasy MUD called Ellmud. You describe what the player perceives based ONLY on the provided game state. You are atmospheric, evocative, and concise.

ABSOLUTE RULES:
- Describe ONLY what exists in the provided state. Never invent items, creatures, exits, or characters.
- Never use mechanical numbers (HP, damage values, percentages, levels). Translate everything to qualitative language.
- Never name other players. Refer to them indirectly ("a figure in dark leather", "someone").
- Never mention Schema field names or technical terms.
- Respect the tone and verbosity directives exactly.
- Do not resolve mechanics or suggest actions. You describe; you do not decide.`;

function buildUserPrompt(context: NarrationContext): string {
  return `Narration type: ${context.narration_type}
Tone: ${context.narrative_directives.tone}
Verbosity: ${context.narrative_directives.verbosity}

Game state:
${JSON.stringify({
    room: context.room,
    player: {
      condition: context.player.hp_pct > 0.6 ? 'healthy' : context.player.hp_pct > 0.3 ? 'wounded' : 'critical',
      statuses: context.player.statuses,
      stance: context.player.stance,
      visited_before: context.player.visited_before,
    },
    recent_events: context.recent_events.map((e) => e.summary),
  }, null, 2)}

Generate atmospheric prose for this ${context.narration_type.replace(/_/g, ' ')}.`;
}

// ─── Default Transport (Azure AI Foundry) ────────────────────────────────────

/**
 * Create a transport function that calls Azure AI Foundry.
 * Uses plain fetch — no SDK dependency needed.
 */
export function createAzureTransport(config: LLMClientConfig): LLMTransport {
  const url = `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;

  return async (request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Azure AI Foundry error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<LLMResponse>;
  };
}

// ─── LLM Client ──────────────────────────────────────────────────────────────

export class LLMClient {
  private readonly transport: LLMTransport;

  constructor(transport: LLMTransport) {
    this.transport = transport;
  }

  /**
   * Generate narration from the LLM.
   *
   * @param context - The narration context (game state snapshot)
   * @param modelConfig - Token budget and temperature
   * @param signal - AbortSignal for timeout enforcement
   * @returns The generated prose, or null if output validation fails
   */
  async generate(
    context: NarrationContext,
    modelConfig: NarrationModelConfig,
    signal: AbortSignal,
  ): Promise<{ text: string | null; rejected: boolean; reason?: string }> {
    const request: LLMRequest = {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(context) },
      ],
      max_tokens: modelConfig.max_tokens,
      temperature: modelConfig.temperature,
    };

    const response = await this.transport(request, signal);

    const text = response.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { text: null, rejected: true, reason: 'Empty LLM response' };
    }

    const validationError = validateLLMOutput(text, context);
    if (validationError) {
      return { text: null, rejected: true, reason: validationError };
    }

    return { text, rejected: false };
  }
}
