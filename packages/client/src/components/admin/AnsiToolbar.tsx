/**
 * AnsiToolbar — Inline ANSI formatting toolbar for admin textareas.
 *
 * Wraps selected text with ANSI tags or inserts empty tag pair at cursor.
 * Designed to sit above a textarea, connected via ref.
 */

import React from "react";

interface AnsiToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (newValue: string) => void;
}

const COLORS = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "bright-black", "bright-red", "bright-green", "bright-yellow",
  "bright-blue", "bright-magenta", "bright-cyan", "bright-white",
] as const;

const MODIFIERS = ["bold", "dim", "italic", "underline"] as const;

function insertTag(
  textarea: HTMLTextAreaElement,
  tag: string,
  onInsert: (v: string) => void,
) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const open = `[${tag}]`;
  const close = `[/${tag}]`;
  const insertion = selected ? `${open}${selected}${close}` : `${open}${close}`;

  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const newValue = before + insertion + after;

  onInsert(newValue);

  // Restore cursor position after React re-render
  const cursorPos = selected
    ? selectionStart + insertion.length
    : selectionStart + open.length;

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorPos, cursorPos);
  });
}

export default function AnsiToolbar({ textareaRef, onInsert }: AnsiToolbarProps) {
  const handleClick = (tag: string) => {
    if (!textareaRef.current) return;
    insertTag(textareaRef.current, tag, onInsert);
  };

  const btnBase =
    "text-[10px] leading-tight px-1.5 py-0.5 rounded border border-[#2A2B35] hover:border-[#C9A84C] transition-colors cursor-pointer";

  return (
    <div
      className="px-2 py-1.5 flex flex-wrap items-center gap-1 border border-[#2A2B35] border-b-0 rounded-t"
      style={{ background: "#0D0E14" }}
    >
      {COLORS.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => handleClick(name)}
          className={`ansi-${name} ${btnBase}`}
          style={{ background: "#12131A" }}
          title={`[${name}]…[/${name}]`}
        >
          {name}
        </button>
      ))}

      <span className="w-px h-4 bg-[#2A2B35] mx-0.5" />

      {MODIFIERS.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => handleClick(name)}
          className={`ansi-${name} text-[#E8E0D0] ${btnBase}`}
          style={{ background: "#12131A" }}
          title={`[${name}]…[/${name}]`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
