"use strict";
/**
 * exit-detection.test.ts — Exit detection in narrative prose.
 *
 * Tests that parseExits correctly identifies direction words in
 * LLM-generated prose without false positives or brittle regex failures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const exit_detection_js_1 = require("../utils/exit-detection.js");
/** Helper — extract just exit directions from segments. */
function exitDirections(segments) {
    return segments
        .filter((s) => s.kind === 'exit')
        .map((s) => s.direction);
}
/** Helper — reconstruct the original text from segments. */
function reconstruct(segments) {
    return segments
        .map((s) => (s.kind === 'exit' ? s.original : s.value))
        .join('');
}
(0, vitest_1.describe)('parseExits', () => {
    // ─── Room Description 1: Classic MUD ───────────────────────────────────
    (0, vitest_1.it)('detects exits in a classic MUD room description', () => {
        const text = 'You stand in a dimly lit corridor. Passages lead north and east. ' +
            'A staircase spirals down into darkness.';
        const exits = ['north', 'east', 'down'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north', 'east', 'down']);
        (0, vitest_1.expect)(reconstruct(segments)).toBe(text);
    });
    // ─── Room Description 2: Flowery LLM Prose ────────────────────────────
    (0, vitest_1.it)('detects exits in elaborate LLM-generated prose', () => {
        const text = 'The chamber opens into a vast cathedral of stone. To the north, ' +
            'a faint breeze carries the scent of pine. The south passage is ' +
            'blocked by rubble, but a narrow gap to the west offers escape.';
        const exits = ['north', 'west'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north', 'west']);
        // "south" is mentioned but not in exits — should NOT be linked
        (0, vitest_1.expect)(segments.find((s) => s.kind === 'exit' && s.direction === 'south')).toBeUndefined();
    });
    // ─── Room Description 3: Directions with Capitalization ────────────────
    (0, vitest_1.it)('handles capitalized and uppercase directions', () => {
        const text = 'North lies the marketplace. To the East, merchants hawk their wares. ' +
            'The path UP leads to the watchtower.';
        const exits = ['north', 'east', 'up'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north', 'east', 'up']);
        // Preserves original casing in display
        const exitSegments = segments.filter((s) => s.kind === 'exit');
        (0, vitest_1.expect)(exitSegments[0].original).toBe('North');
        (0, vitest_1.expect)(exitSegments[1].original).toBe('East');
        (0, vitest_1.expect)(exitSegments[2].original).toBe('UP');
    });
    // ─── Room Description 4: Avoid False Positives ─────────────────────────
    (0, vitest_1.it)('does not match directions embedded in longer words', () => {
        const text = 'The northern wall is cracked. An eastward breeze blows. ' +
            'A southern accent fills the air. The downstairs chamber echoes. ' +
            'An upstairs balcony overlooks the hall.';
        const exits = ['north', 'east', 'south', 'down', 'up'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        // None of these should match — they are parts of longer words
        (0, vitest_1.expect)(exitDirections(segments)).toEqual([]);
    });
    // ─── Room Description 5: Header Exit List ──────────────────────────────
    (0, vitest_1.it)('detects exits in the header "Exits:" line', () => {
        const text = 'Exits: north, south, east';
        const exits = ['north', 'south', 'east'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north', 'south', 'east']);
    });
    // ─── Room Description 6: Vertical Movement ────────────────────────────
    (0, vitest_1.it)('handles up and down in vertical passages', () => {
        const text = 'A rickety ladder leads up through a hole in the ceiling. ' +
            'Below, the floor has collapsed — you could climb down into the rubble.';
        const exits = ['up', 'down'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['up', 'down']);
    });
    // ─── Room Description 7: Punctuation Adjacent ─────────────────────────
    (0, vitest_1.it)('matches directions adjacent to punctuation', () => {
        const text = 'You can go north. To the east, a door awaits. Head south!';
        const exits = ['north', 'east', 'south'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north', 'east', 'south']);
        (0, vitest_1.expect)(reconstruct(segments)).toBe(text);
    });
    // ─── Room Description 8: Only Available Exits ─────────────────────────
    (0, vitest_1.it)('only links directions that are actual exits', () => {
        const text = 'Corridors lead north and south. To the east, a collapsed wall. ' +
            'West is a dead end.';
        // Only north is a real exit
        const exits = ['north'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north']);
    });
    // ─── Edge Cases ────────────────────────────────────────────────────────
    (0, vitest_1.it)('returns plain text when no exits provided', () => {
        const text = 'You stand in an empty room.';
        const segments = (0, exit_detection_js_1.parseExits)(text, []);
        (0, vitest_1.expect)(segments).toEqual([{ kind: 'text', value: text }]);
    });
    (0, vitest_1.it)('returns empty array for empty text', () => {
        const segments = (0, exit_detection_js_1.parseExits)('', ['north']);
        (0, vitest_1.expect)(segments).toEqual([]);
    });
    (0, vitest_1.it)('preserves full text integrity through parse-reconstruct', () => {
        const text = 'The ancient hall stretches before you. A gentle wind blows from the north, ' +
            'carrying whispers from the east. The southern gate is sealed, but west ' +
            'remains open. Stairs lead down to the crypts below, while a ladder goes up ' +
            'to the belfry.';
        const exits = ['north', 'east', 'west', 'down', 'up'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(reconstruct(segments)).toBe(text);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north', 'east', 'west', 'down', 'up']);
    });
    (0, vitest_1.it)('handles direction at the very start of text', () => {
        const text = 'North opens to a courtyard.';
        const exits = ['north'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north']);
        (0, vitest_1.expect)(reconstruct(segments)).toBe(text);
    });
    (0, vitest_1.it)('handles direction at the very end of text', () => {
        const text = 'The only way out is north';
        const exits = ['north'];
        const segments = (0, exit_detection_js_1.parseExits)(text, exits);
        (0, vitest_1.expect)(exitDirections(segments)).toEqual(['north']);
        (0, vitest_1.expect)(reconstruct(segments)).toBe(text);
    });
});
//# sourceMappingURL=exit-detection.test.js.map