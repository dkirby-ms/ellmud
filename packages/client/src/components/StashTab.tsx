import { useState } from "react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Package, Weight, RotateCw, Trash2 } from "lucide-react";

interface GridItem {
  id: string;
  name: string;
  type: string;
  tier: "scrap" | "common" | "sturdy" | "refined" | "masterwork" | "anomalous";
  width: number; // grid cells
  height: number; // grid cells
  weight: number;
  durability: number;
  x: number; // position in grid
  y: number;
  rotated: boolean;
}

const GRID_WIDTH = 10;
const GRID_HEIGHT = 12;
const CELL_SIZE = 50; // pixels

const mockItems: GridItem[] = [
  {
    id: "1",
    name: "Corroded Halberd",
    type: "Weapon",
    tier: "sturdy",
    width: 1,
    height: 4,
    weight: 8,
    durability: 65,
    x: 0,
    y: 0,
    rotated: false,
  },
  {
    id: "2",
    name: "Ironbound Chestplate",
    type: "Armor",
    tier: "refined",
    width: 2,
    height: 3,
    weight: 15,
    durability: 80,
    x: 2,
    y: 0,
    rotated: false,
  },
  {
    id: "3",
    name: "Veilkeeper's Tome",
    type: "Tool",
    tier: "masterwork",
    width: 2,
    height: 2,
    weight: 3,
    durability: 100,
    x: 5,
    y: 0,
    rotated: false,
  },
  {
    id: "4",
    name: "Shard-Touched Amulet",
    type: "Accessory",
    tier: "anomalous",
    width: 1,
    height: 1,
    weight: 1,
    durability: 95,
    x: 8,
    y: 0,
    rotated: false,
  },
  {
    id: "5",
    name: "Weathered Sword",
    type: "Weapon",
    tier: "common",
    width: 1,
    height: 3,
    weight: 5,
    durability: 40,
    x: 0,
    y: 5,
    rotated: false,
  },
  {
    id: "6",
    name: "Health Potion",
    type: "Consumable",
    tier: "common",
    width: 1,
    height: 2,
    weight: 0.5,
    durability: 100,
    x: 2,
    y: 5,
    rotated: false,
  },
  {
    id: "7",
    name: "Ancient Coins",
    type: "Currency",
    tier: "common",
    width: 1,
    height: 1,
    weight: 0.1,
    durability: 100,
    x: 4,
    y: 5,
    rotated: false,
  },
  {
    id: "8",
    name: "Lockpick Set",
    type: "Tool",
    tier: "sturdy",
    width: 2,
    height: 1,
    weight: 1,
    durability: 75,
    x: 6,
    y: 5,
    rotated: false,
  },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case "scrap":
      return "#4A4B55";
    case "common":
      return "#8A8B95";
    case "sturdy":
      return "#6B8E6B";
    case "refined":
      return "#4682B4";
    case "masterwork":
      return "#7B4FA0";
    case "anomalous":
      return "#DAA520";
    default:
      return "#8A8B95";
  }
};

interface InventoryItemProps {
  item: GridItem;
  onMove: (id: string, x: number, y: number) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}

function InventoryItem({ item, onMove, onRotate, onDelete }: InventoryItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ITEM",
    item: { id: item.id, width: item.width, height: item.height },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [showActions, setShowActions] = useState(false);

  const width = item.rotated ? item.height : item.width;
  const height = item.rotated ? item.width : item.height;

  return (
    <div
      ref={drag}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className="absolute cursor-move group"
      style={{
        left: item.x * CELL_SIZE,
        top: item.y * CELL_SIZE,
        width: width * CELL_SIZE,
        height: height * CELL_SIZE,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
      }}
    >
      <div
        className="w-full h-full border-2 rounded flex flex-col items-center justify-center p-1 relative overflow-hidden"
        style={{
          borderColor: getTierColor(item.tier),
          backgroundColor: getTierColor(item.tier) + "20",
        }}
      >
        {/* Item name - truncated */}
        <div
          className="text-center text-xs leading-tight px-1"
          style={{
            fontFamily: "var(--font-serif)",
            color: getTierColor(item.tier),
            fontSize: width === 1 ? "0.65rem" : "0.75rem",
          }}
        >
          {item.name}
        </div>

        {/* Weight indicator */}
        <div
          className="text-[#8A8B95] text-[0.6rem] mt-auto"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {item.weight}kg
        </div>

        {/* Durability bar */}
        {item.durability < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1C1D27]">
            <div
              className="h-full bg-gradient-to-r from-[#8B2500] via-[#B8860B] to-[#2D6B4F]"
              style={{ width: `${item.durability}%` }}
            />
          </div>
        )}

        {/* Action buttons on hover */}
        {showActions && (
          <div className="absolute top-0 right-0 flex gap-0.5 p-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRotate(item.id);
              }}
              className="bg-[#1C1D27] hover:bg-[#2A2B35] p-1 rounded"
              title="Rotate"
            >
              <RotateCw className="w-3 h-3 text-[#8A8B95]" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="bg-[#1C1D27] hover:bg-[#8B2500] p-1 rounded"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-[#8A8B95]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface GridCellProps {
  x: number;
  y: number;
  onDrop: (x: number, y: number, item: any) => void;
  isOccupied: boolean;
}

function GridCell({ x, y, onDrop, isOccupied }: GridCellProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "ITEM",
    drop: (item: any) => {
      onDrop(x, y, item);
    },
    canDrop: () => !isOccupied,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const bgColor = isOver && canDrop ? "#C9A84C20" : "transparent";

  return (
    <div
      ref={drop}
      className="border border-[#2A2B35]"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: bgColor,
      }}
    />
  );
}

function StashTabContent() {
  const [items, setItems] = useState<GridItem[]>(mockItems);
  const [selectedItem, setSelectedItem] = useState<GridItem | null>(null);

  const handleDrop = (x: number, y: number, draggedItem: any) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === draggedItem.id ? { ...item, x, y } : item
      )
    );
  };

  const handleRotate = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, rotated: !item.rotated }
          : item
      )
    );
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const handleItemClick = (item: GridItem) => {
    setSelectedItem(item);
  };

  // Create occupancy map
  const occupiedCells = new Set<string>();
  items.forEach((item) => {
    const width = item.rotated ? item.height : item.width;
    const height = item.rotated ? item.width : item.height;
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        occupiedCells.add(`${item.x + dx},${item.y + dy}`);
      }
    }
  });

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const maxWeight = 100;
  const usedCells = occupiedCells.size;
  const totalCells = GRID_WIDTH * GRID_HEIGHT;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2
          className="text-[#C9A84C]"
          style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
        >
          Stash
        </h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Weight className="w-4 h-4 text-[#8A8B95]" />
            <span
              className="text-[#E8E0D0]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {totalWeight.toFixed(1)} / {maxWeight} kg
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#8A8B95]" />
            <span
              className="text-[#E8E0D0]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {usedCells} / {totalCells} cells
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Main Stash Grid */}
        <div className="flex-1">
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 inline-block">
            <div className="relative" style={{ width: GRID_WIDTH * CELL_SIZE, height: GRID_HEIGHT * CELL_SIZE }}>
              {/* Grid cells */}
              <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, ${CELL_SIZE}px)` }}>
                {Array.from({ length: GRID_HEIGHT }).map((_, y) =>
                  Array.from({ length: GRID_WIDTH }).map((_, x) => (
                    <GridCell
                      key={`${x},${y}`}
                      x={x}
                      y={y}
                      onDrop={handleDrop}
                      isOccupied={occupiedCells.has(`${x},${y}`)}
                    />
                  ))
                )}
              </div>

              {/* Items */}
              {items.map((item) => (
                <div key={item.id} onClick={() => handleItemClick(item)}>
                  <InventoryItem
                    item={item}
                    onMove={(id, x, y) => handleDrop(x, y, { id })}
                    onRotate={handleRotate}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Item Inspector */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
            <h3
              className="text-[#C9A84C] mb-4"
              style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem" }}
            >
              Item Details
            </h3>
            {selectedItem ? (
              <div className="space-y-4">
                <div>
                  <h4
                    className="mb-2"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "1rem",
                      color: getTierColor(selectedItem.tier),
                    }}
                  >
                    {selectedItem.name}
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-1 rounded text-xs capitalize"
                      style={{
                        backgroundColor: getTierColor(selectedItem.tier) + "20",
                        color: getTierColor(selectedItem.tier),
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {selectedItem.tier}
                    </span>
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {selectedItem.type}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Weight
                    </span>
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {selectedItem.weight} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Size
                    </span>
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {selectedItem.width}×{selectedItem.height}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span
                        className="text-[#8A8B95] text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Durability
                      </span>
                      <span
                        className="text-[#E8E0D0] text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {selectedItem.durability}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#1C1D27] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#8B2500] via-[#B8860B] to-[#2D6B4F]"
                        style={{ width: `${selectedItem.durability}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    className="flex-1 px-3 py-2 bg-[#3A7D7B] hover:bg-[#2D6B4F] text-[#E8E0D0] rounded text-sm transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Equip
                  </button>
                  <button
                    className="flex-1 px-3 py-2 bg-[#1C1D27] hover:bg-[#2A2B35] text-[#8A8B95] rounded text-sm transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Sell
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="text-[#4A4B55] text-sm text-center py-8"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Click an item to view details
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
            <h3
              className="text-[#C9A84C] mb-4"
              style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem" }}
            >
              Stash Summary
            </h3>
            <div
              className="space-y-2 text-sm"
              style={{ fontFamily: "var(--font-mono)", color: "#E8E0D0" }}
            >
              <div className="flex justify-between">
                <span className="text-[#8A8B95]">Total Items:</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8B95]">Weight Usage:</span>
                <span>{((totalWeight / maxWeight) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8B95]">Space Usage:</span>
                <span>{((usedCells / totalCells) * 100).toFixed(1)}%</span>
              </div>
              <div className="border-t border-[#2A2B35] pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">By Tier:</span>
                </div>
                {Object.entries(
                  items.reduce((acc, item) => {
                    acc[item.tier] = (acc[item.tier] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([tier, count]) => (
                  <div key={tier} className="flex justify-between pl-4">
                    <span style={{ color: getTierColor(tier) }} className="capitalize">
                      {tier}:
                    </span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StashTab() {
  return (
    <DndProvider backend={HTML5Backend}>
      <StashTabContent />
    </DndProvider>
  );
}