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
      return "var(--color-tier-common)";
    case "sturdy":
      return "var(--color-tier-sturdy)";
    case "refined":
      return "var(--color-tier-refined)";
    case "masterwork":
      return "var(--color-tier-masterwork)";
    case "anomalous":
      return "var(--color-tier-anomalous)";
    default:
      return "var(--color-tier-common)";
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
      <div className="relative w-[60%] bg-bg-panel shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-panel border-b border-border-muted p-6 flex items-center justify-between z-10">
          <h2
            className="text-accent-gold font-serif"
            style={{ fontSize: "1.5rem" }}
          >
            Inventory
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-accent-gold transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Carried Items */}
          <div>
            <h3
              className="text-text-secondary text-sm mb-4 font-sans"
            >
              Carried Items
            </h3>
            <div className="space-y-3">
              {carriedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-bg-elevated border rounded-lg p-4 hover:border-accent-gold transition-colors cursor-pointer"
                  style={{
                    borderColor: `color-mix(in srgb, ${getTierColor(item.tier)} 25%, transparent)`,
                    borderLeftWidth: "4px",
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4
                        className="mb-1 font-serif"
                        style={{
                          fontSize: "1.125rem",
                          color: getTierColor(item.tier),
                        }}
                      >
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-3">
                        <span className="text-text-secondary text-sm font-sans">
                          {item.type}
                        </span>
                        <span className="flex items-center gap-1 text-text-secondary text-sm font-sans">
                          <Weight className="w-3 h-3" />
                          {item.weight} units
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span
                        className="text-text-disabled text-xs font-sans"
                      >
                        Durability
                      </span>
                      <span
                        className="text-text-secondary text-xs font-mono"
                      >
                        {item.durability}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-success to-warning"
                        style={{ width: `${item.durability}%` }}
                      ></div>
                    </div>
                  </div>

                  <p
                    className="text-text-secondary text-sm italic mb-3 font-serif"
                    style={{ lineHeight: 1.6 }}
                  >
                    {item.flavorText}
                  </p>

                  <div className="mb-3 flex gap-2 flex-wrap">
                    {item.stats.map((stat) => (
                      <span
                        key={stat}
                        className="px-2 py-1 bg-bg-primary text-text-secondary text-xs rounded font-mono"
                      >
                        {stat}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 text-interactive hover:bg-bg-elevated rounded text-sm transition-colors font-sans"
                    >
                      Equip
                    </button>
                    <button
                      className="px-3 py-1 text-text-secondary hover:bg-bg-elevated rounded text-sm transition-colors font-sans"
                    >
                      Use
                    </button>
                    <button
                      className="px-3 py-1 text-danger hover:bg-bg-elevated rounded text-sm transition-colors font-sans"
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
              className="text-text-secondary text-sm mb-4 font-sans"
            >
              Equipped Gear
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded border border-border-muted">
                <Sword className="w-4 h-4 text-text-secondary" />
                <div className="flex-1">
                  <p className="text-text-disabled text-xs mb-1 font-sans">
                    Primary Weapon
                  </p>
                  <p className="text-tier-sturdy font-serif">
                    Corroded Halberd
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded border border-border-muted">
                <Shield className="w-4 h-4 text-text-secondary" />
                <div className="flex-1">
                  <p className="text-text-disabled text-xs mb-1 font-sans">
                    Chest Armour
                  </p>
                  <p className="text-tier-refined font-serif">
                    Ironbound Chestplate
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Weight Indicator */}
          <div className="border-t border-border-muted pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-text-secondary text-sm font-sans">
                Carried Weight
              </span>
              <span className="text-text-primary font-mono">
                14 / 20 units
              </span>
            </div>
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div className="h-full w-[70%] bg-success"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
