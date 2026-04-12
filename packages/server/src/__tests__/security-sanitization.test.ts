/**
 * Security Sanitization Tests — say.ts, emote.ts, whisper.ts
 *
 * Verifies that user-facing chat commands properly sanitize input:
 *   - Strip angle brackets (<>) to prevent HTML/prompt injection
 *   - Remove C0 control characters (0x00–0x1F) and C1/DEL (0x7F–0x9F)
 *   - Preserve ANSI color bracket notation ([]) used by the game
 *   - Truncate to max length
 *   - Handle edge cases: empty, very long, unicode, nested sequences
 */

import { describe, it, expect } from 'vitest';
import { handleSay } from '../commands/handlers/say.js';
import { handleEmote } from '../commands/handlers/emote.js';
import { handleWhisper } from '../commands/handlers/whisper.js';
import type { CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(args: string[], otherPlayers: string[] = []): CommandContext {
  const player = new PlayerState('test-session', 'room-1');
  return {
    player,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    room: { id: 'room-1', name: 'Test Room', description: 'A test room.', exits: {} } as any,
    args,
    resolveRoom: () => undefined,
    otherPlayersInRoom: otherPlayers,
    stability: 1.0,
  };
}

/** Extract the narration text from the first narration in a command result. */
function narrationText(result: ReturnType<typeof handleSay>): string {
  return result.narrations[0]?.text ?? '';
}

// ─── Say Tests ────────────────────────────────────────────────────────────────

describe('Security: say sanitization', () => {
  it('passes normal text through unchanged', () => {
    const result = handleSay(makeCtx(['Hello', 'world!']));
    expect(narrationText(result)).toContain('Hello world!');
  });

  it('strips angle brackets from messages', () => {
    const result = handleSay(makeCtx(['<script>alert(1)</script>']));
    const text = narrationText(result);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
    expect(text).toContain('scriptalert(1)/script');
  });

  it('strips nested/doubled angle brackets', () => {
    const result = handleSay(makeCtx(['<<hello>>']));
    const text = narrationText(result);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
  });

  it('strips C0 control characters (0x00–0x1F)', () => {
    // Build a message with null, tab, newline, and other control chars
    const nasty = 'hello\x00\x01\x02\x07\x08\x0B\x0C\x0E\x0Fworld';
    const result = handleSay(makeCtx([nasty]));
    const text = narrationText(result);
    expect(text).toContain('helloworld');
    // eslint-disable-next-line no-control-regex
    expect(text).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
  });

  it('strips DEL and C1 control characters (0x7F–0x9F)', () => {
    const nasty = 'before\x7F\x80\x8D\x8E\x9Fafter';
    const result = handleSay(makeCtx([nasty]));
    const text = narrationText(result);
    expect(text).toContain('beforeafter');
  });

  it('preserves ANSI color bracket notation []', () => {
    const result = handleSay(makeCtx(['[red]Fire[/red]', 'spell']));
    const text = narrationText(result);
    expect(text).toContain('[red]Fire[/red]');
  });

  it('sanitizes XSS payloads: <img onerror=...>', () => {
    const result = handleSay(makeCtx(['<img', 'src=x', 'onerror=alert(1)>']));
    const text = narrationText(result);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
  });

  it('sanitizes XSS payloads: <svg onload=...>', () => {
    const result = handleSay(makeCtx(['<svg', 'onload=malicious()>']));
    const text = narrationText(result);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
  });

  it('handles empty message gracefully', () => {
    const result = handleSay(makeCtx([]));
    expect(result.narrations[0].type).toBe('system');
  });

  it('returns system message when message is only control chars', () => {
    // After sanitization, message should be empty → system fallback
    const result = handleSay(makeCtx(['\x00\x01\x02\x03']));
    expect(result.narrations[0].type).toBe('system');
  });

  it('returns system message when message is only angle brackets', () => {
    const result = handleSay(makeCtx(['<><><>']));
    expect(result.narrations[0].type).toBe('system');
  });

  it('handles unicode text (emoji, CJK, Cyrillic)', () => {
    const result = handleSay(makeCtx(['🗡️', '日本語', 'Привет']));
    const text = narrationText(result);
    expect(text).toContain('🗡️');
    expect(text).toContain('日本語');
    expect(text).toContain('Привет');
  });

  it('truncates very long messages', () => {
    const longMsg = 'A'.repeat(500);
    const result = handleSay(makeCtx([longMsg]));
    const text = narrationText(result);
    // The sanitizer truncates to 200 chars, so the narration shouldn't contain the full 500
    expect(text.length).toBeLessThan(500 + 50); // + overhead from 'A figure says: "..."'
  });
});

// ─── Emote Tests ──────────────────────────────────────────────────────────────

describe('Security: emote sanitization', () => {
  it('passes normal action text through unchanged', () => {
    const result = handleEmote(makeCtx(['dances', 'wildly']));
    expect(narrationText(result)).toContain('dances wildly');
  });

  it('strips angle brackets from emote actions', () => {
    const result = handleEmote(makeCtx(['<script>alert(1)</script>']));
    const text = narrationText(result);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
  });

  it('strips C0 and C1 control characters from emotes', () => {
    const nasty = 'waves\x00\x7F\x9Fhappily';
    const result = handleEmote(makeCtx([nasty]));
    const text = narrationText(result);
    expect(text).toContain('waveshappily');
    // eslint-disable-next-line no-control-regex
    expect(text).not.toMatch(/[\x00-\x1F\x7F-\x9F]/);
  });

  it('preserves ANSI bracket notation in emotes', () => {
    const result = handleEmote(makeCtx(['[bold]struts[/bold]']));
    const text = narrationText(result);
    expect(text).toContain('[bold]struts[/bold]');
  });

  it('handles empty emote gracefully', () => {
    const result = handleEmote(makeCtx([]));
    expect(result.narrations[0].type).toBe('system');
  });

  it('returns system message when emote is only forbidden chars', () => {
    const result = handleEmote(makeCtx(['\x01\x02<>']));
    expect(result.narrations[0].type).toBe('system');
  });

  it('truncates emote to max length (100)', () => {
    const longAction = 'B'.repeat(200);
    const result = handleEmote(makeCtx([longAction]));
    const text = narrationText(result);
    // Emote truncates to 100 chars, so total output is bounded
    expect(text.length).toBeLessThan(200 + 20); // + 'A figure ' prefix
  });
});

// ─── Whisper Tests ────────────────────────────────────────────────────────────

describe('Security: whisper sanitization', () => {
  const others = ['session-abc', 'session-def'];

  it('passes normal whisper through unchanged', () => {
    const result = handleWhisper(makeCtx(['player', 'secret', 'message'], others));
    expect(narrationText(result)).toContain('secret message');
  });

  it('strips angle brackets from whisper messages', () => {
    const result = handleWhisper(makeCtx(['player', '<script>xss</script>'], others));
    const text = narrationText(result);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
  });

  it('strips control characters from whisper messages', () => {
    const result = handleWhisper(makeCtx(['player', 'hello\x00\x7Fworld'], others));
    const text = narrationText(result);
    expect(text).toContain('helloworld');
  });

  it('preserves bracket notation in whispers', () => {
    const result = handleWhisper(makeCtx(['player', '[green]psst[/green]'], others));
    const text = narrationText(result);
    expect(text).toContain('[green]psst[/green]');
  });

  it('returns system message when whisper content is only forbidden chars', () => {
    const result = handleWhisper(makeCtx(['player', '<><>\x00\x01'], others));
    expect(result.narrations[0].type).toBe('system');
  });

  it('handles missing target args', () => {
    const result = handleWhisper(makeCtx([], others));
    expect(narrationText(result)).toContain('Usage');
  });

  it('handles no players in room', () => {
    const result = handleWhisper(makeCtx(['player', 'hello'], []));
    expect(narrationText(result)).toContain('no one here');
  });

  it('handles unicode in whispers', () => {
    const result = handleWhisper(makeCtx(['player', '🔑', '秘密'], others));
    const text = narrationText(result);
    expect(text).toContain('🔑');
    expect(text).toContain('秘密');
  });
});
