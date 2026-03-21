import { Sword, Shield, Droplet, Wrench, Key } from "lucide-react";

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
        className="text-[#C9A84C] mb-6"
        style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
      >
        Loadout
      </h2>

      <div className="grid grid-cols-2 gap-8">
        {/* Equipment */}
        <div>
          <h3
            className="text-[#8A8B95] text-sm mb-4"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Equipment
          </h3>
          <div className="space-y-3">
            {equipmentSlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 hover:border-[#3A7D7B] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-[#8A8B95]">{slot.icon}</div>
                  <div className="flex-1">
                    <p
                      className="text-[#4A4B55] text-xs mb-1"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {slot.label}
                    </p>
                    {slot.equipped ? (
                      <p
                        className="text-[#E8E0D0]"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {slot.equipped}
                      </p>
                    ) : (
                      <p
                        className="text-[#4A4B55] italic"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        [empty]
                      </p>
                    )}
                  </div>
                  {slot.equipped && (
                    <button
                      className="text-[#8A8B95] hover:text-[#8B2500] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
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
              className="text-[#8A8B95] text-sm mb-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Consumables
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {consumableSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 hover:border-[#3A7D7B] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-4 h-4 text-[#8A8B95]" />
                    <p
                      className="text-[#4A4B55] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Slot {slot.id.replace("c", "")}
                    </p>
                  </div>
                  {slot.equipped ? (
                    <p
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {slot.equipped}
                    </p>
                  ) : (
                    <p
                      className="text-[#4A4B55] italic text-sm"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      [empty]
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3
              className="text-[#8A8B95] text-sm mb-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Tools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {toolSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 hover:border-[#3A7D7B] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-[#8A8B95]" />
                    <p
                      className="text-[#4A4B55] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Slot {slot.id.replace("t", "")}
                    </p>
                  </div>
                  {slot.equipped ? (
                    <p
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {slot.equipped}
                    </p>
                  ) : (
                    <p
                      className="text-[#4A4B55] italic text-sm"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      [empty]
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3
              className="text-[#8A8B95] text-sm mb-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Shard Key
            </h3>
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-[#C9A84C]" />
                <div>
                  <p
                    className="text-[#E8E0D0]"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Corrupted Iron Key
                  </p>
                  <p
                    className="text-[#4A4B55] text-xs"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Grants access to Tier 1 shards
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-8 bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
        <h3
          className="text-[#8A8B95] text-sm mb-4"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Current Stats
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p
              className="text-[#4A4B55] text-xs mb-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Attack Power
            </p>
            <p
              className="text-[#E8E0D0]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Moderate
            </p>
          </div>
          <div>
            <p
              className="text-[#4A4B55] text-xs mb-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Defence
            </p>
            <p
              className="text-[#E8E0D0]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Light
            </p>
          </div>
          <div>
            <p
              className="text-[#4A4B55] text-xs mb-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Carry Weight
            </p>
            <p
              className="text-[#E8E0D0]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              23 / 50 units
            </p>
          </div>
          <div>
            <p
              className="text-[#4A4B55] text-xs mb-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Mobility
            </p>
            <p
              className="text-[#E8E0D0]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              High
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}