/**
 * LLM Client — wraps OpenAI-compatible endpoints for narration.
 *
 * Enforces timeout via AbortController, validates output contract (GDD §4.4),
 * and constructs structured prompts from NarrationContext.
 *
 * Designed for dependency injection: all external services are mockable.
 */

import type { NarrationContext, NarrationModelConfig } from '@ellmud/shared';
import { DefaultAzureCredential } from '@azure/identity';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The shape of a chat completion request sent to an OpenAI-compatible endpoint. */
export interface LLMRequest {
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  max_tokens: number;
  temperature: number;
}

/** Minimal response shape from the chat completions endpoint. */
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


// ─── Output Validation (GDD §4.4) ───────────────────────────────────────────

/**
 * Patterns that indicate the LLM violated the output contract.
 * If any match, the response is rejected.
 */
const FORBIDDEN_PATTERNS = [
  /\b\d+\s*(?:HP|hp|Hp|damage|dmg|hit points)\b/,
  /\b(?:damage|heal|health|mana):\s*\d+/i,
  /\b\d+%/,
  /\b\d+\s*(?:gold|coins|water|draws|XP|experience)\b/i,
  /\b(?:level|lvl)\s*\d+/i,
];

/** Schema keywords that should never appear in narrated prose. */
const SCHEMA_KEYWORDS = [
  'hp_pct',
  'zone_stability',
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

/**
 * System prompt for sound narration.
 * Emphasizes direction, quality, and atmospheric rendering of distant sounds.
 */
const SOUND_SYSTEM_PROMPT = `You are the auditory sense of a dark fantasy MUD. Describe sounds players hear from other locations.

ABSOLUTE RULES:
- Describe sound direction clearly ("from the north", "somewhere east")
- Match sound quality to source type: combat = "clash of metal", running = "hurried footsteps"
- Express intensity through language, never mechanically ("faint" vs "piercing" vs "barely perceptible")
- Never use mechanical values (noise level, decibel, etc.)
- Keep descriptions to 1-2 sentences max.`;

/**
 * System prompt for trace narration.
 * Emphasizes skill-based detail progression and environmental storytelling.
 */
const TRACE_SYSTEM_PROMPT = `You are the tracking sense of a dark fantasy MUD. Describe environmental traces left by movement, combat, and interaction.

ABSOLUTE RULES:
- Scale detail to the player's tracking skill: low = vague ("footprints lead east"), high = detailed ("heavy boots, warrior bearing, passed 2 min ago")
- Include age when evident: "fresh blood", "old bootprints", "fading traces"
- Never name individuals. Describe only gear, bearing, and evidence
- Never use mechanical skill values or percentages
- Keep descriptions to 2-3 sentences max.`;

/**
 * System prompt for awareness/stealth narration.
 * Emphasizes detection levels and equipment-based identification.
 */
const AWARENESS_SYSTEM_PROMPT = `You are the danger sense of a dark fantasy MUD. Describe how players detect the presence of other entities (players, creatures).

ABSOLUTE RULES:
- Match perception to stealth vs awareness: vague senses = "you sense presence", clear = equipment descriptions
- NEVER use player names. Describe only visible equipment ("battered chainmail", "twin daggers")
- Scale from: no detection (no message) → vague ("shadow shifts") → partial (equipment hint) → full (detailed appearance)
- Never use mechanical skill values
- Keep descriptions to 1-2 sentences max.`;

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

/**
 * Select the appropriate system prompt based on narration type.
 */
function getSystemPrompt(narrationtype: string): string {
  if (narrationtype === 'sound_narration') return SOUND_SYSTEM_PROMPT;
  if (narrationtype === 'trace_narration') return TRACE_SYSTEM_PROMPT;
  if (narrationtype === 'awareness_narration') return AWARENESS_SYSTEM_PROMPT;
  return SYSTEM_PROMPT;
}

// ─── OpenAI-Compatible Transport ─────────────────────────────────────────────

/** Configuration for an OpenAI-compatible LLM endpoint. */
export interface OpenAITransportConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

/** Azure Cognitive Services scope accepted by Azure OpenAI for Entra bearer auth. */
export const AZURE_OPENAI_TOKEN_SCOPE = 'https://cognitiveservices.azure.com/.default';

/** Refresh cached Azure tokens before they are close to expiry. */
const AZURE_TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface AzureOpenAIToken {
  token: string;
  expiresOnTimestamp: number;
}

export type AzureOpenAITokenProvider = () => Promise<AzureOpenAIToken>;

export interface AzureOpenAITransportConfig {
  endpoint: string;
  deployment: string;
  apiVersion?: string;
  tokenProvider?: AzureOpenAITokenProvider;
}

function trimTrailingSlash(endpoint: string): string {
  return endpoint.replace(/\/+$/, '');
}

/**
 * Create a transport function that calls any OpenAI-compatible endpoint.
 * Works with OpenAI, LM Studio, Ollama, Mistral, and other compatible APIs.
 */
export function createOpenAITransport(config: OpenAITransportConfig): LLMTransport {
  const url = `${trimTrailingSlash(config.endpoint)}/v1/chat/completions`;

  return async (request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible LLM error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<LLMResponse>;
  };
}

function createDefaultAzureOpenAITokenProvider(): AzureOpenAITokenProvider {
  const credential = new DefaultAzureCredential();

  return async () => {
    const accessToken = await credential.getToken(AZURE_OPENAI_TOKEN_SCOPE);
    if (!accessToken) {
      throw new Error('Azure OpenAI token acquisition failed');
    }
    return {
      token: accessToken.token,
      expiresOnTimestamp: accessToken.expiresOnTimestamp,
    };
  };
}

/**
 * Create an Azure OpenAI chat-completions transport using Entra bearer tokens.
 * DefaultAzureCredential supports ACA managed identity in production and local
 * developer credentials such as Azure CLI sign-in.
 */
export function createAzureOpenAITransport(config: AzureOpenAITransportConfig): LLMTransport {
  const apiVersion = config.apiVersion ?? '2024-10-21';
  const url = `${trimTrailingSlash(config.endpoint)}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const tokenProvider = config.tokenProvider ?? createDefaultAzureOpenAITokenProvider();
  let cachedToken: AzureOpenAIToken | undefined;
  let refreshPromise: Promise<AzureOpenAIToken> | undefined;

  async function getToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresOnTimestamp - AZURE_TOKEN_REFRESH_MARGIN_MS > now) {
      return cachedToken.token;
    }

    refreshPromise ??= tokenProvider().then((token) => {
      cachedToken = token;
      return token;
    }).finally(() => {
      refreshPromise = undefined;
    });

    return (await refreshPromise).token;
  }

  return async (request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> => {
    const token = await getToken();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI LLM error: ${response.status} ${response.statusText}`);
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
        { role: 'system', content: getSystemPrompt(context.narration_type) },
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
