/**
 * AnsiPreview — Read-only ANSI markup preview panel.
 *
 * Used for standalone preview contexts (e.g. creature Live Preview).
 * For editable textareas, use AnsiTextarea instead.
 */

import { useState } from "react";
import { parseAnsiText } from "../../lib/ansi-parser.js";

interface AnsiPreviewProps {
  /** Controlled value from an external textarea. */
  value?: string;
}

export default function AnsiPreview({ value }: AnsiPreviewProps) {
  const [localValue, setLocalValue] = useState("");
  const text = value ?? localValue;
  const isControlled = value !== undefined;

  return (
    <div className="mt-3 border border-[#2A2B35] rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="px-3 py-1.5 text-xs text-[#8A8B95] border-b border-[#2A2B35] flex items-center justify-between"
        style={{ fontFamily: "var(--font-sans)", background: "#0D0E14" }}
      >
        <span>ANSI Preview</span>
        <span className="text-[#4A4B55]">
          Syntax: [color]text[/color]
        </span>
      </div>

      {/* Standalone textarea (only when uncontrolled) */}
      {!isControlled && (
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          rows={3}
          placeholder="Type ANSI markup here… e.g. [red]danger[/red]"
          className="w-full bg-[#0A0B0F] border-b border-[#2A2B35] px-3 py-2 text-[#E8E0D0] focus:outline-none resize-none text-sm"
        />
      )}

      {/* Live Preview */}
      <div
        className="px-4 py-3 min-h-[2.5rem] text-sm narrative-terminal whitespace-pre-wrap"
        style={{ background: "#0A0B0F" }}
      >
        {text ? (
          parseAnsiText(text)
        ) : (
          <span className="text-[#4A4B55] italic">Preview will appear here…</span>
        )}
      </div>
    </div>
  );
}
