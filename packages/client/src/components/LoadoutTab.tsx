import { Sword, Shield, Droplet, Wrench, Key } from "lucide-react";
import AnsiText from "./AnsiText.js";

interface EquipmentSlot {
  id: string;
  label: string;
  icon: React.ReactNode;
  equipped: string | null;
}

const equipmentSlots: EquipmentSlot[] = [
  {
    id: "primary",
    label: "Primary Weapon",
    icon: <Sword className="w-5 h-5" />,
    equipped: "Corroded Halberd",
  },
  {
    id: "secondary",
    label: "Secondary Weapon",
    icon: <Sword className="w-5 h-5" />,
    equipped: null,
  },
  {
    id: "head",
    label: "Head Armour",
    icon: <Shield className="w-5 h-5" />,
    equipped: null,
  },
  {
    id: "chest",
    label: "Chest Armour",
    icon: <Shield className="w-5 h-5" />,
    equipped: "Ironbound Chestplate",
  },
  {
    id: "legs",
    label: "Leg Armour",
    icon: <Shield className="w-5 h-5" />,
    equipped: null,
  },
  {
    id: "hands",
    label: "Hand Armour",
    icon: <Shield className="w-5 h-5" />,
    equipped: null,
  },
];

const consumableSlots = [
  { id: "c1", equipped: "Healing Salve" },
  { id: "c2", equipped: "Bandages" },
  { id: "c3", equipped: null },
  { id: "c4", equipped: null },
];

const toolSlots = [
  { id: "t1", equipped: "Lockpick Set" },
  { id: "t2", equipped: null },
];

export default function LoadoutTab() {
  return (
    <div className="p-8">
      <h2
        className="text-accent-gold mb-6 font-serif"
        style={{ fontSize: "1.5rem" }}
      >
        Loadout
      </h2>

      <div className="grid grid-cols-2 gap-8">
        {/* Equipment */}
        <div>
          <h3
            className="text-text-secondary text-sm mb-4 font-sans"
          >
            Equipment
          </h3>
          <div className="space-y-3">
            {equipmentSlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-bg-panel border border-border-muted rounded-lg p-4 hover:border-interactive transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-text-secondary">{slot.icon}</div>
                  <div className="flex-1">
                    <p
                      className="text-text-disabled text-xs mb-1 font-sans"
                    >
                      {slot.label}
                    </p>
                    {slot.equipped ? (
                      <p className="text-text-primary font-serif">
                        <AnsiText text={slot.equipped} />
                      </p>
                    ) : (
                      <p className="text-text-disabled italic font-serif">
                        [empty]
                      </p>
                    )}
                  </div>
                  {slot.equipped && (
                    <button
                      className="text-text-secondary hover:text-danger text-xs font-sans"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Consumables & Tools */}
        <div>
          <div className="mb-6">
            <h3
              className="text-text-secondary text-sm mb-4 font-sans"
            >
              Consumables
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {consumableSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-bg-panel border border-border-muted rounded-lg p-4 hover:border-interactive transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-4 h-4 text-text-secondary" />
                    <p
                      className="text-text-disabled text-xs font-sans"
                    >
                      Slot {slot.id.replace("c", "")}
                    </p>
                  </div>
                  {slot.equipped ? (
                    <p className="text-text-primary text-sm font-serif">
                      <AnsiText text={slot.equipped} />
                    </p>
                  ) : (
                    <p className="text-text-disabled italic text-sm font-serif">
                      [empty]
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3
              className="text-text-secondary text-sm mb-4 font-sans"
            >
              Tools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {toolSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-bg-panel border border-border-muted rounded-lg p-4 hover:border-interactive transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-text-secondary" />
                    <p
                      className="text-text-disabled text-xs font-sans"
                    >
                      Slot {slot.id.replace("t", "")}
                    </p>
                  </div>
                  {slot.equipped ? (
                    <p className="text-text-primary text-sm font-serif">
                      <AnsiText text={slot.equipped} />
                    </p>
                  ) : (
                    <p className="text-text-disabled italic text-sm font-serif">
                      [empty]
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3
              className="text-text-secondary text-sm mb-4 font-sans"
            >
              Zone Key
            </h3>
            <div className="bg-bg-panel border border-border-muted rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-accent-gold" />
                <div>
                  <p className="text-text-primary font-serif">
                    <AnsiText text="Corrupted Iron Key" />
                  </p>
                  <p className="text-text-disabled text-xs font-sans">
                    Grants access to Tier 1 zones
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-8 bg-bg-panel border border-border-muted rounded-lg p-6">
        <h3
          className="text-text-secondary text-sm mb-4 font-sans"
        >
          Current Stats
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p
              className="text-text-disabled text-xs mb-1 font-sans"
            >
              Attack Power
            </p>
            <p className="text-text-primary font-mono">
              Moderate
            </p>
          </div>
          <div>
            <p
              className="text-text-disabled text-xs mb-1 font-sans"
            >
              Defence
            </p>
            <p className="text-text-primary font-mono">
              Light
            </p>
          </div>
          <div>
            <p
              className="text-text-disabled text-xs mb-1 font-sans"
            >
              Carry Weight
            </p>
            <p className="text-text-primary font-mono">
              23 / 50 units
            </p>
          </div>
          <div>
            <p
              className="text-text-disabled text-xs mb-1 font-sans"
            >
              Mobility
            </p>
            <p className="text-text-primary font-mono">
              High
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
