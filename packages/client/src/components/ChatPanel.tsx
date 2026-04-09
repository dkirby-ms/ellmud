import { useState } from "react";
import { X, Send } from "lucide-react";
import AnsiText from "./AnsiText.js";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: "zone" | "hub";
  onSendMessage?: (text: string) => void;
}

type ChatTab = "proximity" | "whisper" | "hub" | "squad";

interface ChatMessage {
  id: string;
  type: "player" | "system" | "emote" | "whisper";
  speaker?: string;
  message: string;
}

export default function ChatPanel({
  isOpen,
  onClose,
  context,
  onSendMessage,
}: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>(
    context === "zone" ? "proximity" : "hub"
  );
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "system",
      message: "You have entered the proximity chat.",
    },
    {
      id: "2",
      type: "player",
      speaker: "A figure in dark leather",
      message: "Anyone found the key?",
    },
    {
      id: "3",
      type: "emote",
      speaker: "A hooded figure",
      message: "A hooded figure listens carefully, hand on weapon.",
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Send via Colyseus if handler provided
    if (onSendMessage) {
      const text = message.trim();
      if (text.startsWith("/whisper ")) {
        onSendMessage(`whisper ${text.slice(9)}`);
      } else if (text.startsWith("/emote ")) {
        onSendMessage(`emote ${text.slice(7)}`);
      } else if (text.startsWith("/say ")) {
        onSendMessage(`say ${text.slice(5)}`);
      } else {
        onSendMessage(`say ${text}`);
      }
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "player",
      speaker: "You",
      message: message,
    };

    setMessages([...messages, newMessage]);
    setMessage("");
  };

  if (!isOpen) return null;

  const tabs: { id: ChatTab; label: string; available: boolean }[] = [
    { id: "proximity", label: "Proximity", available: context === "zone" },
    { id: "whisper", label: "Whisper", available: true },
    { id: "hub", label: "Hub", available: context === "hub" },
    { id: "squad", label: "Squad", available: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>

      {/* Panel */}
      <div className="relative w-[40%] bg-bg-panel shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-bg-panel border-b border-border-muted p-4 flex items-center justify-between">
          <h2
            className="text-accent-gold font-serif"
            style={{ fontSize: "1.25rem" }}
          >
            Chat & Social
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-accent-gold transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Tabs */}
        <div className="flex gap-1 px-4 border-b border-border-muted">
          {tabs
            .filter((tab) => tab.available)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-accent-gold text-accent-gold"
                    : "text-text-secondary hover:text-text-primary"
                } font-sans`}
              >
                {tab.label}
              </button>
            ))}
          <button
            disabled
            className="px-4 py-2 text-text-disabled cursor-not-allowed font-sans"
          >
            Squad
          </button>
        </div>

        {/* Players Nearby (if in zone) */}
        {context === "zone" && (
          <div className="p-4 border-b border-border-muted">
            <h3
              className="text-text-secondary text-xs mb-3 font-sans"
            >
              Nearby Presences
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning"></div>
                <span className="text-text-secondary text-sm font-serif">
                  A figure in dark leather
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning"></div>
                <span className="text-text-secondary text-sm font-serif">
                  A hooded figure
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 narrative-scroll narrative-terminal">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "system" && (
                <p className="mud-system">
                  {msg.message}
                </p>
              )}

              {msg.type === "player" && (
                <div>
                  <span className="ansi-cyan">{msg.speaker}</span>
                  <span className="mud-speech"> &ldquo;{msg.message}&rdquo;</span>
                </div>
              )}

              {msg.type === "emote" && (
                <p className="ansi-dim ansi-italic">
                  <AnsiText text={msg.message} />
                </p>
              )}

              {msg.type === "whisper" && (
                <div>
                  <span className="ansi-magenta">[whisper] {msg.speaker}</span>
                  <span className="mud-speech"> &ldquo;{msg.message}&rdquo;</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-border-muted bg-bg-primary"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something..."
              className="flex-1 bg-bg-elevated border border-border-muted rounded px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-interactive focus:outline-none font-mono"
              style={{ fontSize: "0.875rem" }}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-interactive hover:bg-interactive/90 text-text-primary rounded transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-text-disabled text-xs mt-2 font-mono">
            Commands: /say /whisper &lt;name&gt; /emote
          </p>
        </form>
      </div>
    </div>
  );
}
