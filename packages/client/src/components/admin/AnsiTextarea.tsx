/**
 * AnsiTextarea — Combined ANSI toolbar + textarea + live preview.
 *
 * Drop-in replacement for the old textarea + AnsiPreview pattern.
 * Toolbar inserts ANSI tags at the cursor / wraps selected text.
 * Preview renders the markup in real time.
 */

import { useRef, useState } from "react";
import { parseAnsiText } from "../../lib/ansi-parser.js";
import AnsiToolbar from "./AnsiToolbar.js";

interface AnsiTextareaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  label?: string;
  /** Extra className applied to the textarea element. */
  className?: string;
  /** Extra inline style applied to the textarea element. */
  style?: React.CSSProperties;
}

export default function AnsiTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  label,
  className,
  style,
}: AnsiTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewOpen, setPreviewOpen] = useState(true);

  return (
    <div>
      {label && (
        <label
          className="block text-[#8A8B95] text-sm mb-2"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {label}
        </label>
      )}

      {/* Toolbar */}
      <AnsiToolbar textareaRef={textareaRef} onInsert={onChange} />

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={
          className ??
          "w-full bg-[#1C1D27] border border-[#2A2B35] rounded-none px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
        }
        style={style}
      />

      {/* Collapsible Preview */}
      <div className="border border-[#2A2B35] border-t-0 rounded-b overflow-hidden">
        <button
          type="button"
          onClick={() => setPreviewOpen((o) => !o)}
          className="w-full px-3 py-1.5 text-xs text-[#8A8B95] cursor-pointer select-none hover:text-[#E8E0D0] transition-colors text-left flex items-center justify-between"
          style={{ fontFamily: "var(--font-sans)", background: "#0D0E14" }}
        >
          <span>ANSI Preview</span>
          <span className="text-[#4A4B55]">{previewOpen ? "▾" : "▸"}</span>
        </button>
        {previewOpen && (
          <div
            className="px-4 py-3 min-h-[2rem] text-sm narrative-terminal whitespace-pre-wrap"
            style={{ background: "#0A0B0F" }}
          >
            {value ? (
              parseAnsiText(value)
            ) : (
              <span className="text-[#4A4B55] italic">Preview will appear here…</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
