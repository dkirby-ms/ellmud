/**
 * AnsiDescriptionEditor — editable textarea with ANSI tag toolbar and live preview.
 *
 * Drop-in replacement for a plain <textarea> in admin forms.
 * Provides:
 *   - Raw mode: editable textarea with a compact color-tag insertion toolbar
 *   - Preview mode: renders ANSI-markup text on a dark terminal background
 */

import { useState, useRef, useCallback } from "react";
import { parseAnsiText } from "../../lib/ansi-parser.js";

// ─── Tag palette ─────────────────────────────────────────────────────────────

const COLOR_TAGS = [
  "red", "green", "blue", "yellow", "cyan", "magenta", "white",
] as const;

const MODIFIER_TAGS = ["bold", "dim", "italic", "underline"] as const;

/** Visible chip colour for each tag — matches the .ansi-* CSS palette. */
const TAG_CHIP_COLORS: Record<string, string> = {
  red:     "#CC0000",
  green:   "#4E9A06",
  blue:    "#3465A4",
  yellow:  "#C4A000",
  cyan:    "#06989A",
  magenta: "#75507B",
  white:   "#D3D7CF",
  bold:    "#E8E0D0",
  dim:     "#8A8B95",
  italic:  "#E8E0D0",
  underline: "#E8E0D0",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface AnsiDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnsiDescriptionEditor({
  value,
  onChange,
  rows = 8,
  placeholder = "Room description as the player will see it…",
  className,
}: AnsiDescriptionEditorProps) {
  const [mode, setMode] = useState<"raw" | "preview">("raw");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Wrap selected text (or insert at cursor) with [tag]…[/tag]. */
  const insertTag = useCallback(
    (tag: string) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);

      const before = value.slice(0, start);
      const after = value.slice(end);
      const wrapped = `[${tag}]${selected}[/${tag}]`;

      const next = before + wrapped + after;
      onChange(next);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        ta.focus();
        if (selected) {
          // Select the wrapped content (inside tags)
          const contentStart = start + tag.length + 2; // after [tag]
          const contentEnd = contentStart + selected.length;
          ta.setSelectionRange(contentStart, contentEnd);
        } else {
          // Place cursor between the tags
          const cursor = start + tag.length + 2;
          ta.setSelectionRange(cursor, cursor);
        }
      });
    },
    [value, onChange],
  );

  return (
    <div className={className}>
      {/* Header row: label + mode toggle */}
      <div className="flex items-center justify-between mb-1">
        <label
          className="text-[#8A8B95] text-xs"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Description
        </label>
        <div
          className="flex rounded overflow-hidden border border-[#2A2B35]"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <button
            type="button"
            onClick={() => setMode("raw")}
            className="px-2 py-0.5 text-[10px] transition-colors cursor-pointer"
            style={{
              background: mode === "raw" ? "#2A2B35" : "#12131A",
              color: mode === "raw" ? "#E8E0D0" : "#8A8B95",
            }}
          >
            Raw
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className="px-2 py-0.5 text-[10px] transition-colors cursor-pointer"
            style={{
              background: mode === "preview" ? "#2A2B35" : "#12131A",
              color: mode === "preview" ? "#E8E0D0" : "#8A8B95",
            }}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Tag insertion toolbar (Raw mode only) */}
      {mode === "raw" && (
        <div className="flex flex-wrap gap-1 mb-1">
          {COLOR_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => insertTag(tag)}
              title={`[${tag}]…[/${tag}]`}
              className="px-1.5 py-0.5 rounded text-[10px] border border-[#2A2B35] hover:border-[#C9A84C] transition-colors cursor-pointer"
              style={{
                background: "#12131A",
                color: TAG_CHIP_COLORS[tag],
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
              }}
            >
              {tag}
            </button>
          ))}
          <span className="w-px bg-[#2A2B35] mx-0.5" />
          {MODIFIER_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => insertTag(tag)}
              title={`[${tag}]…[/${tag}]`}
              className="px-1.5 py-0.5 rounded text-[10px] border border-[#2A2B35] hover:border-[#C9A84C] transition-colors cursor-pointer"
              style={{
                background: "#12131A",
                color: TAG_CHIP_COLORS[tag],
                fontFamily: "var(--font-sans)",
                fontWeight: tag === "bold" ? 700 : undefined,
                fontStyle: tag === "italic" ? "italic" : undefined,
                textDecoration: tag === "underline" ? "underline" : undefined,
                opacity: tag === "dim" ? 0.5 : undefined,
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Raw textarea */}
      {mode === "raw" && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-2 text-[#D3D7CF] text-sm leading-relaxed focus:border-[#C9A84C] focus:outline-none resize-y"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", lineHeight: "1.35" }}
          placeholder={placeholder}
        />
      )}

      {/* Preview panel */}
      {mode === "preview" && (
        <div
          className="rounded border border-[#2A2B35] px-3 py-2 whitespace-pre-wrap narrative-terminal overflow-auto"
          style={{
            minHeight: `${rows * 1.35}rem`,
            maxHeight: `${rows * 2}rem`,
            background: "#0A0B0F",
          }}
        >
          {value ? (
            parseAnsiText(value)
          ) : (
            <span style={{ color: "#4A4B55", fontStyle: "italic" }}>
              No description yet.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
