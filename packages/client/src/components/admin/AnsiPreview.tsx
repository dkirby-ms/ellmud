/**
 * AnsiPreview — Admin-facing ANSI markup preview panel.
 *
 * Accepts either a controlled `value` prop (for embedding next to an existing
 * textarea) or renders its own textarea when used standalone.
 *
 * Features:
 *   - Live preview of ANSI-markup text on a dark terminal background
 *   - Quick-reference palette with copy-to-clipboard buttons
 */

import { useState } from "react";
import { parseAnsiText } from "../../lib/ansi-parser.js";

interface AnsiPreviewProps {
  /** Controlled value from an external textarea. */
  value?: string;
}

const PALETTE_COLORS = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "bright-black", "bright-red", "bright-green", "bright-yellow",
  "bright-blue", "bright-magenta", "bright-cyan", "bright-white",
] as const;

const PALETTE_MODIFIERS = ["bold", "dim", "italic", "underline"] as const;

function copyTag(name: string) {
  navigator.clipboard.writeText(`[${name}]text[/${name}]`);
}

export default function AnsiPreview({ value }: AnsiPreviewProps) {
  const [localValue, setLocalValue] = useState("");
  const text = value ?? localValue;
  const isControlled = value !== undefined;

  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleCopy = (name: string) => {
    copyTag(name);
    setCopiedTag(name);
    setTimeout(() => setCopiedTag(null), 1200);
  };

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

      {/* Quick-reference palette */}
      <details className="border-t border-[#2A2B35]">
        <summary
          className="px-3 py-1.5 text-xs text-[#8A8B95] cursor-pointer select-none hover:text-[#E8E0D0] transition-colors"
          style={{ fontFamily: "var(--font-sans)", background: "#0D0E14" }}
        >
          Color Reference
        </summary>
        <div className="px-3 py-2 flex flex-wrap gap-1" style={{ background: "#0D0E14" }}>
          {PALETTE_COLORS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleCopy(name)}
              className={`ansi-${name} text-xs px-1.5 py-0.5 rounded border border-[#2A2B35] hover:border-[#C9A84C] transition-colors cursor-pointer`}
              style={{ background: "#12131A" }}
              title={`[${name}]text[/${name}]`}
            >
              {copiedTag === name ? "✓" : name}
            </button>
          ))}
          {PALETTE_MODIFIERS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleCopy(name)}
              className={`ansi-${name} text-xs px-1.5 py-0.5 rounded border border-[#2A2B35] hover:border-[#C9A84C] transition-colors cursor-pointer text-[#E8E0D0]`}
              style={{ background: "#12131A" }}
              title={`[${name}]text[/${name}]`}
            >
              {copiedTag === name ? "✓" : name}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
