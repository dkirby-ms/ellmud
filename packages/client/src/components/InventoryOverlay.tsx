import { X, Sword, Shield, Droplet, Wrench, Weight } from "lucide-react";

interface InventoryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Item {
  id: string;
  name: string;
  type: string;
  tier: "common" | "sturdy" | "refined" | "masterwork" | "anomalous";
  durability: number;
  weight: number;
  flavorText: string;
  stats: string[];
}

const carriedItems: Item[] = [
  {
    id: "1",
    name: "Weathered Dagger",
    type: "Weapon",
    tier: "common",
    durability: 45,
    weight: 2,
    flavorText:
      "A simple blade, worn by years of use. The leather grip is frayed but the steel remains sharp.",
    stats: ["Light damage", "Quick", "Fragile"],
  },
  {
    id: "2",
    name: "Veilkeeper's Scroll",
    type: "Tool",
    tier: "refined",
    durability: 90,
    weight: 1,
    flavorText:
      "Ancient parchment covered in glowing runes. The text shifts when you're not looking directly at it.",
    stats: ["Reveals hidden paths", "Single use"],
  },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case "common":
      return "#E8E0D0";
    case "sturdy":
      return "#6B8E6B";
    case "refined":
      return "#4682B4";
    case "masterwork":
      return "#7B4FA0";
    case "anomalous":
      return "#DAA520";
    default:
      return "#E8E0D0";
  }
};

export default function InventoryOverlay({
  isOpen,
  onClose,
}: InventoryOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div className="relative w-[60%] bg-[#12131A] shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#12131A] border-b border-[#2A2B35] p-6 flex items-center justify-between z-10">
          <h2
            className="text-[#C9A84C]"
            style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
          >
            Inventory
          </h2>
          <button
            onClick={onClose}
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Carried Items */}
          <div>
            <h3
              className="text-[#8A8B95] text-sm mb-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Carried Items
            </h3>
            <div className="space-y-3">
              {carriedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1C1D27] border rounded-lg p-4 hover:border-[#C9A84C] transition-colors cursor-pointer"
                  style={{
                    borderColor: getTierColor(item.tier) + "40",
                    borderLeftWidth: "4px",
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4
                        className="mb-1"
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "1.125rem",
                          color: getTierColor(item.tier),
                        }}
                      >
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[#8A8B95] text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {item.type}
                        </span>
                        <span
                          className="flex items-center gap-1 text-[#8A8B95] text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <Weight className="w-3 h-3" />
                          {item.weight} units
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span
                        className="text-[#4A4B55] text-xs"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Durability
                      </span>
                      <span
                        className="text-[#8A8B95] text-xs"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {item.durability}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#0A0B0F] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2D6B4F] to-[#B8860B]"
                        style={{ width: `${item.durability}%` }}
                      ></div>
                    </div>
                  </div>

                  <p
                    className="text-[#8A8B95] text-sm italic mb-3"
                    style={{ fontFamily: "var(--font-serif)", lineHeight: 1.6 }}
                  >
                    {item.flavorText}
                  </p>

                  <div className="mb-3 flex gap-2 flex-wrap">
                    {item.stats.map((stat) => (
                      <span
                        key={stat}
                        className="px-2 py-1 bg-[#0A0B0F] text-[#8A8B95] text-xs rounded"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {stat}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 text-[#3A7D7B] hover:bg-[#1C1D27] rounded text-sm transition-colors"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Equip
                    </button>
                    <button
                      className="px-3 py-1 text-[#8A8B95] hover:bg-[#1C1D27] rounded text-sm transition-colors"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Use
                    </button>
                    <button
                      className="px-3 py-1 text-[#8B2500] hover:bg-[#1C1D27] rounded text-sm transition-colors"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Drop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equipped Gear */}
          <div>
            <h3
              className="text-[#8A8B95] text-sm mb-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Equipped Gear
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-[#1C1D27] rounded border border-[#2A2B35]">
                <Sword className="w-4 h-4 text-[#8A8B95]" />
                <div className="flex-1">
                  <p
                    className="text-[#4A4B55] text-xs mb-1"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Primary Weapon
                  </p>
                  <p
                    className="text-[#6B8E6B]"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Corroded Halberd
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#1C1D27] rounded border border-[#2A2B35]">
                <Shield className="w-4 h-4 text-[#8A8B95]" />
                <div className="flex-1">
                  <p
                    className="text-[#4A4B55] text-xs mb-1"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Chest Armour
                  </p>
                  <p
                    className="text-[#4682B4]"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Ironbound Chestplate
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Weight Indicator */}
          <div className="border-t border-[#2A2B35] pt-4">
            <div className="flex justify-between mb-2">
              <span
                className="text-[#8A8B95] text-sm"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Carried Weight
              </span>
              <span
                className="text-[#E8E0D0]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                14 / 20 units
              </span>
            </div>
            <div className="h-2 bg-[#1C1D27] rounded-full overflow-hidden">
              <div className="h-full w-[70%] bg-[#2D6B4F]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
