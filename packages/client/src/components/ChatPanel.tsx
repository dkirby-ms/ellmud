import { useState } from "react";
import { X, Send } from "lucide-react";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: "shard" | "refuge";
  onSendMessage?: (text: string) => void;
}

type ChatTab = "proximity" | "whisper" | "refuge" | "squad";

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
    context === "shard" ? "proximity" : "refuge"
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
    { id: "proximity", label: "Proximity", available: context === "shard" },
    { id: "whisper", label: "Whisper", available: true },
    { id: "refuge", label: "Refuge", available: context === "refuge" },
    { id: "squad", label: "Squad", available: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>

      {/* Panel */}
      <div className="relative w-[40%] bg-[#12131A] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-[#12131A] border-b border-[#2A2B35] p-4 flex items-center justify-between">
          <h2
            className="text-[#C9A84C]"
            style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}
          >
            Chat & Social
          </h2>
          <button
            onClick={onClose}
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Tabs */}
        <div className="flex gap-1 px-4 border-b border-[#2A2B35]">
          {tabs
            .filter((tab) => tab.available)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-[#C9A84C] text-[#C9A84C]"
                    : "text-[#8A8B95] hover:text-[#E8E0D0]"
                }`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {tab.label}
              </button>
            ))}
          <button
            disabled
            className="px-4 py-2 text-[#4A4B55] cursor-not-allowed"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Squad
          </button>
        </div>

        {/* Players Nearby (if in shard) */}
        {context === "shard" && (
          <div className="p-4 border-b border-[#2A2B35]">
            <h3
              className="text-[#8A8B95] text-xs mb-3"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Nearby Presences
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#B8860B]"></div>
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  A figure in dark leather
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#B8860B]"></div>
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  A hooded figure
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "system" && (
                <p
                  className="text-[#4A4B55] text-xs"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {msg.message}
                </p>
              )}

              {msg.type === "player" && (
                <div>
                  <p
                    className="text-[#8A8B95] text-xs mb-1"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {msg.speaker}
                  </p>
                  <p
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    "{msg.message}"
                  </p>
                </div>
              )}

              {msg.type === "emote" && (
                <p
                  className="text-[#8A8B95] text-sm italic"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {msg.message}
                </p>
              )}

              {msg.type === "whisper" && (
                <div>
                  <p
                    className="text-[#3A7D7B] text-xs mb-1"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    [whisper] {msg.speaker}
                  </p>
                  <p
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    "{msg.message}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-[#2A2B35] bg-[#0A0B0F]"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something..."
              className="flex-1 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] placeholder-[#4A4B55] focus:border-[#3A7D7B] focus:outline-none"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#3A7D7B] hover:bg-[#2D6B5F] text-[#E8E0D0] rounded transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p
            className="text-[#4A4B55] text-xs mt-2"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Commands: /say /whisper &lt;name&gt; /emote
          </p>
        </form>
      </div>
    </div>
  );
}
