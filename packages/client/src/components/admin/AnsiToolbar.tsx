/**
 * AnsiToolbar — Inline ANSI formatting toolbar for admin textareas.
 *
 * Wraps selected text with ANSI tags or inserts empty tag pair at cursor.
 * Designed to sit above a textarea, connected via ref.
 *
 * Colors render as a compact swatch grid; modifiers remain text buttons.
 */

import React from "react";

interface AnsiToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (newValue: string) => void;
}

/** ANSI color name → hex value (matches tailwind.css .ansi-* classes). */
const COLOR_HEX: Record<string, string> = {
  black:          "#555753",
  red:            "#CC0000",
  green:          "#4E9A06",
  yellow:         "#C4A000",
  blue:           "#3465A4",
  magenta:        "#75507B",
  cyan:           "#06989A",
  white:          "#D3D7CF",
  "bright-black":   "#555753",
  "bright-red":     "#EF2929",
  "bright-green":   "#8AE234",
  "bright-yellow":  "#FCE94F",
  "bright-blue":    "#729FCF",
  "bright-magenta": "#AD7FA8",
  "bright-cyan":    "#34E2E2",
  "bright-white":   "#EEEEEC",
};

const COLORS = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "bright-black", "bright-red", "bright-green", "bright-yellow",
  "bright-blue", "bright-magenta", "bright-cyan", "bright-white",
] as const;

const MODIFIERS = ["bold", "dim", "italic", "underline"] as const;

function insertTag(
  textarea: HTMLTextAreaElement,
  tag: string,
  _onInsert: (v: string) => void,
) {
  textarea.focus();

  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const wrapped = `[${tag}]${selected}[/${tag}]`;

  // Select the range we're replacing, then insert via execCommand
  // so Ctrl+Z undoes the tag insertion as a single step.
  textarea.setSelectionRange(selectionStart, selectionEnd);
  document.execCommand("insertText", false, wrapped);

  // execCommand fires the input event → React state updates via onChange.
  // Position cursor after the insertion (or inside tags if no selection).
  requestAnimationFrame(() => {
    textarea.focus();
    if (selected) {
      const cursorPos = selectionStart + wrapped.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    } else {
      const cursorPos = selectionStart + tag.length + 2; // after [tag]
      textarea.setSelectionRange(cursorPos, cursorPos);
    }
  });
}

export default function AnsiToolbar({ textareaRef, onInsert }: AnsiToolbarProps) {
  const handleClick = (tag: string) => {
    if (!textareaRef.current) return;
    insertTag(textareaRef.current, tag, onInsert);
  };

  const modBtnBase =
    "text-[10px] leading-tight px-1.5 py-0.5 rounded border border-[#2A2B35] hover:border-[#C9A84C] transition-colors cursor-pointer";

  return (
    <div
      className="px-2 py-1.5 flex flex-wrap items-center gap-1 border border-[#2A2B35] border-b-0 rounded-t"
      style={{ background: "#0D0E14" }}
    >
      {/* Color swatch grid — two rows of 8 */}
      <div className="grid grid-cols-8 gap-0.5" role="group" aria-label="ANSI colors">
        {COLORS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => handleClick(name)}
            aria-label={name}
            title={`[${name}]…[/${name}]`}
            className="w-5 h-5 rounded-sm border border-[#2A2B35] hover:border-[#C9A84C] hover:scale-110 transition-all cursor-pointer"
            style={{ background: COLOR_HEX[name] }}
          />
        ))}
      </div>

      <span className="w-px h-4 bg-[#2A2B35] mx-0.5" />

      {MODIFIERS.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => handleClick(name)}
          className={`ansi-${name} text-[#E8E0D0] ${modBtnBase}`}
          style={{ background: "#12131A" }}
          title={`[${name}]…[/${name}]`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
