import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RefugeTab =
  | 'stash'
  | 'loadout'
  | 'crafting'
  | 'marketplace'
  | 'factions'
  | 'contracts'
  | 'shardboard';

export interface AmbientEvent {
  id: string;
  text: string;
  npc: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface RefugeHubProps {
  activeTab: RefugeTab;
  ambientEvents: AmbientEvent[];
  chatMessages: ChatMessage[];
  onTabChange: (tab: RefugeTab) => void;
  onChatSend: (text: string) => void;
}

// ─── Tab Definitions ─────────────────────────────────────────────────────────

interface TabDef {
  id: RefugeTab;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'stash', label: 'Stash', icon: '📦' },
  { id: 'loadout', label: 'Loadout', icon: '⚔️' },
  { id: 'crafting', label: 'Crafting', icon: '🔨' },
  { id: 'marketplace', label: 'Marketplace', icon: '🏪' },
  { id: 'factions', label: 'Factions', icon: '🏛️' },
  { id: 'contracts', label: 'Contracts', icon: '📜' },
  { id: 'shardboard', label: 'Shardboard', icon: '🌀' },
];

// ─── Tab Content Panels ──────────────────────────────────────────────────────

function StashPanel(): React.JSX.Element {
  return (
    <div className="refuge-panel refuge-panel--stash">
      <h2 className="refuge-panel__title">Stash</h2>
      <div className="refuge-panel__controls">
        <button className="refuge-panel__filter-btn" type="button">Sort</button>
        <button className="refuge-panel__filter-btn" type="button">Filter</button>
      </div>
      <div className="refuge-panel__grid" role="list">
        <div className="stash-item" role="listitem">
          <span className="stash-item__icon">🗡️</span>
          <span className="stash-item__name stash-item__name--common">Iron Sword</span>
          <span className="stash-item__type">Weapon</span>
          <div className="stash-item__durability" role="progressbar" aria-valuenow={80} aria-valuemin={0} aria-valuemax={100}>
            <div className="stash-item__durability-fill" style={{ width: '80%' }} />
          </div>
          <span className="stash-item__weight">3.2</span>
        </div>
        <div className="stash-item" role="listitem">
          <span className="stash-item__icon">🛡️</span>
          <span className="stash-item__name stash-item__name--sturdy">Oak Shield</span>
          <span className="stash-item__type">Armor</span>
          <div className="stash-item__durability" role="progressbar" aria-valuenow={95} aria-valuemin={0} aria-valuemax={100}>
            <div className="stash-item__durability-fill" style={{ width: '95%' }} />
          </div>
          <span className="stash-item__weight">5.0</span>
        </div>
      </div>
    </div>
  );
}

function LoadoutPanel(): React.JSX.Element {
  const slots = [
    { id: 'weapon-1', label: 'Main Hand', type: 'weapon' },
    { id: 'weapon-2', label: 'Off Hand', type: 'weapon' },
    { id: 'armor-head', label: 'Head', type: 'armor' },
    { id: 'armor-chest', label: 'Chest', type: 'armor' },
    { id: 'armor-legs', label: 'Legs', type: 'armor' },
    { id: 'armor-feet', label: 'Feet', type: 'armor' },
    { id: 'consumable-1', label: 'Consumable 1', type: 'consumable' },
    { id: 'consumable-2', label: 'Consumable 2', type: 'consumable' },
    { id: 'consumable-3', label: 'Consumable 3', type: 'consumable' },
    { id: 'consumable-4', label: 'Consumable 4', type: 'consumable' },
    { id: 'tool-1', label: 'Tool 1', type: 'tool' },
    { id: 'tool-2', label: 'Tool 2', type: 'tool' },
    { id: 'shard-key', label: 'Shard Key', type: 'key' },
  ];

  return (
    <div className="refuge-panel refuge-panel--loadout">
      <h2 className="refuge-panel__title">Loadout</h2>
      <div className="loadout__slots" role="list">
        {slots.map((slot) => (
          <div key={slot.id} className={`loadout__slot loadout__slot--${slot.type}`} role="listitem">
            <span className="loadout__slot-label">{slot.label}</span>
            <span className="loadout__slot-empty">Empty</span>
          </div>
        ))}
      </div>
      <div className="loadout__stats">
        <h3 className="loadout__stats-title">Stats Summary</h3>
        <div className="loadout__stat">
          <span className="loadout__stat-label">Attack</span>
          <span className="loadout__stat-value">0</span>
        </div>
        <div className="loadout__stat">
          <span className="loadout__stat-label">Defense</span>
          <span className="loadout__stat-value">0</span>
        </div>
        <div className="loadout__stat">
          <span className="loadout__stat-label">Weight</span>
          <span className="loadout__stat-value">0 / 50</span>
        </div>
      </div>
    </div>
  );
}

function CraftingPanel(): React.JSX.Element {
  return (
    <div className="refuge-panel refuge-panel--crafting">
      <h2 className="refuge-panel__title">Crafting</h2>
      <div className="crafting__layout">
        <div className="crafting__recipe-list" role="list">
          <div className="crafting__recipe" role="listitem">Iron Dagger</div>
          <div className="crafting__recipe crafting__recipe--selected" role="listitem">Steel Sword</div>
          <div className="crafting__recipe" role="listitem">Healing Salve</div>
        </div>
        <div className="crafting__details">
          <h3 className="crafting__recipe-name">Steel Sword</h3>
          <div className="crafting__materials" role="list">
            <div className="crafting__material" role="listitem">
              <span className="crafting__material-name">Steel Ingot</span>
              <span className="crafting__material-count">2 / 3</span>
            </div>
            <div className="crafting__material" role="listitem">
              <span className="crafting__material-name">Leather Wrap</span>
              <span className="crafting__material-count">1 / 1</span>
            </div>
          </div>
          <div className="crafting__skill-check">
            <span className="crafting__skill-label">Skill Required:</span>
            <span className="crafting__skill-value">Smithing 15</span>
          </div>
          <button className="crafting__craft-btn" type="button" disabled>Craft</button>
        </div>
      </div>
    </div>
  );
}

function MarketplacePanel(): React.JSX.Element {
  return (
    <div className="refuge-panel refuge-panel--marketplace">
      <h2 className="refuge-panel__title">Marketplace</h2>
      <table className="marketplace__table" role="table">
        <thead>
          <tr>
            <th>Item Offered</th>
            <th>Item Wanted</th>
            <th>Seller</th>
            <th>Time Left</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Iron Sword</td>
            <td>Steel Ingot ×3</td>
            <td>Trader Vex</td>
            <td>2h 15m</td>
          </tr>
          <tr>
            <td>Healing Salve ×5</td>
            <td>Leather Wrap ×2</td>
            <td>Alchemist Mira</td>
            <td>45m</td>
          </tr>
        </tbody>
      </table>
      <button className="marketplace__post-btn" type="button">Post Listing</button>
    </div>
  );
}

function FactionsPanel(): React.JSX.Element {
  return (
    <div className="refuge-panel refuge-panel--factions">
      <h2 className="refuge-panel__title">Factions</h2>
      <div className="faction-card">
        <h3 className="faction-card__name">The Forge Wardens</h3>
        <p className="faction-card__description">Keepers of the ancient forges, masters of metalcraft and shard refinement.</p>
        <div className="faction-card__reputation">
          <span className="faction-card__rep-label">Reputation</span>
          <div className="faction-card__rep-bar" role="progressbar" aria-valuenow={45} aria-valuemin={0} aria-valuemax={100}>
            <div className="faction-card__rep-fill" style={{ width: '45%' }} />
          </div>
        </div>
        <div className="faction-card__rank">
          <span className="faction-card__rank-label">Rank:</span>
          <span className="faction-card__rank-value">Initiate</span>
        </div>
        <div className="faction-card__perks" role="list">
          <div className="faction-card__perk" role="listitem">Forge Access</div>
          <div className="faction-card__perk faction-card__perk--locked" role="listitem">Master Recipes</div>
        </div>
      </div>
    </div>
  );
}

function ContractsPanel(): React.JSX.Element {
  return (
    <div className="refuge-panel refuge-panel--contracts">
      <h2 className="refuge-panel__title">Contracts</h2>
      <div className="contracts__list" role="list">
        <div className="contract-card" role="listitem">
          <h3 className="contract-card__objective">Retrieve the Lost Shard Fragment</h3>
          <div className="contract-card__reward">
            <span className="contract-card__reward-label">Reward:</span>
            <span className="contract-card__reward-value">50 Marks, Forge Warden Rep +10</span>
          </div>
          <div className="contract-card__deadline">
            <span className="contract-card__deadline-label">Deadline:</span>
            <span className="contract-card__deadline-value">3 Shard Runs</span>
          </div>
          <div className="contract-card__progress" role="progressbar" aria-valuenow={33} aria-valuemin={0} aria-valuemax={100}>
            <div className="contract-card__progress-fill" style={{ width: '33%' }} />
          </div>
          <span className="contract-card__status">Active</span>
        </div>
        <div className="contract-card contract-card--available" role="listitem">
          <h3 className="contract-card__objective">Clear the Collapsed Tunnels</h3>
          <div className="contract-card__reward">
            <span className="contract-card__reward-label">Reward:</span>
            <span className="contract-card__reward-value">30 Marks</span>
          </div>
          <div className="contract-card__deadline">
            <span className="contract-card__deadline-label">Deadline:</span>
            <span className="contract-card__deadline-value">5 Shard Runs</span>
          </div>
          <span className="contract-card__status">Available</span>
        </div>
      </div>
    </div>
  );
}

function ShardboardPanel(): React.JSX.Element {
  return (
    <div className="refuge-panel refuge-panel--shardboard">
      <h2 className="refuge-panel__title">Shardboard</h2>
      <div className="shardboard__grid" role="list">
        <div className="shard-card" role="listitem">
          <h3 className="shard-card__name">Fractured Depths</h3>
          <span className="shard-card__tier">Tier 1</span>
          <span className="shard-card__biome">Cavern</span>
          <span className="shard-card__status">Available</span>
        </div>
        <div className="shard-card" role="listitem">
          <h3 className="shard-card__name">Ashen Reaches</h3>
          <span className="shard-card__tier">Tier 2</span>
          <span className="shard-card__biome">Volcanic</span>
          <span className="shard-card__status">Available</span>
        </div>
      </div>
    </div>
  );
}

// ─── Panel Renderer ──────────────────────────────────────────────────────────

function TabPanel({ tab }: { tab: RefugeTab }): React.JSX.Element {
  switch (tab) {
    case 'stash': return <StashPanel />;
    case 'loadout': return <LoadoutPanel />;
    case 'crafting': return <CraftingPanel />;
    case 'marketplace': return <MarketplacePanel />;
    case 'factions': return <FactionsPanel />;
    case 'contracts': return <ContractsPanel />;
    case 'shardboard': return <ShardboardPanel />;
  }
}

// ─── Chat Input (controlled) ─────────────────────────────────────────────────

function ChatInput({ onSend }: { onSend: (text: string) => void }): React.JSX.Element {
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }, [text, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="chat-input">
      <input
        type="text"
        className="chat-input__field"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Say something..."
        aria-label="Chat message"
      />
      <button
        className="chat-input__send"
        type="button"
        onClick={handleSend}
      >
        Send
      </button>
    </div>
  );
}

// ─── RefugeHub ───────────────────────────────────────────────────────────────

export function RefugeHub({
  activeTab,
  ambientEvents,
  chatMessages,
  onTabChange,
  onChatSend,
}: RefugeHubProps): React.JSX.Element {
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ambient feed when new events arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [ambientEvents]);

  return (
    <div className="refuge-hub">
      {/* Left Sidebar — Tabs + Ambient Feed */}
      <aside className="refuge-hub__sidebar-left">
        <nav className="refuge-nav" role="tablist" aria-label="Refuge navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`refuge-nav__tab${activeTab === tab.id ? ' refuge-nav__tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              <span className="refuge-nav__icon">{tab.icon}</span>
              <span className="refuge-nav__label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="ambient-events-feed" ref={feedRef}>
          <h3 className="ambient-events-feed__title">Ambient Events</h3>
          {ambientEvents.map((evt) => (
            <div key={evt.id} className="ambient-event">
              <span className="ambient-event__npc">{evt.npc}</span>
              <span className="ambient-event__text">{evt.text}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Center — Context Panel */}
      <main className="refuge-hub__center" role="tabpanel" aria-label={`${activeTab} panel`}>
        <TabPanel tab={activeTab} />
      </main>

      {/* Right Sidebar — Social & Chat */}
      <aside className="refuge-hub__sidebar-right">
        <div className="social-panel">
          <h3 className="social-panel__title">Players Nearby</h3>
          <div className="social-panel__players" role="list">
            <div className="social-panel__player" role="listitem">No players nearby</div>
          </div>

          <div className="social-panel__notifications">
            <h3 className="social-panel__title">Trade Requests</h3>
            <div className="social-panel__empty">No pending requests</div>
          </div>
        </div>

        <div className="chat-panel">
          <h3 className="chat-panel__title">Refuge Chat</h3>
          <div className="chat-panel__messages" role="log" aria-live="polite">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="chat-message">
                <span className="chat-message__sender">{msg.sender}</span>
                <span className="chat-message__text">{msg.text}</span>
              </div>
            ))}
          </div>
          <ChatInput onSend={onChatSend} />
        </div>
      </aside>
    </div>
  );
}
