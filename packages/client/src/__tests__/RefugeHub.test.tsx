import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefugeHub, type RefugeHubProps, type RefugeTab } from '../components/RefugeHub.js';
import { AppContext, initialState, type AppContextValue } from '../store.js';

vi.mock('../services/connection.js');

const defaultProps: RefugeHubProps = {
  activeTab: 'stash',
  ambientEvents: [
    { id: 'e1', text: 'A merchant arrives from the eastern road.', npc: 'Merchant Kael' },
    { id: 'e2', text: 'The blacksmith hammers on a glowing blade.', npc: 'Forge Warden' },
  ],
  chatMessages: [
    { id: 'm1', sender: 'Player1', text: 'Hello!', timestamp: 1000 },
    { id: 'm2', sender: 'Trader Vex', text: 'Looking to trade?', timestamp: 2000 },
  ],
  onTabChange: vi.fn(),
  onChatSend: vi.fn(),
};

function renderHub(propsOverride: Partial<RefugeHubProps> = {}, dispatch = vi.fn()) {
  const value: AppContextValue = {
    state: { ...initialState },
    dispatch,
  };
  const props = { ...defaultProps, ...propsOverride };
  return {
    dispatch,
    ...render(
      <AppContext.Provider value={value}>
        <RefugeHub {...props} />
      </AppContext.Provider>,
    ),
  };
}

// ─── Layout ──────────────────────────────────────────────────────────────────

describe('RefugeHub – Layout', () => {
  it('renders with refuge-hub CSS class', () => {
    const { container } = renderHub();
    expect(container.querySelector('.refuge-hub')).toBeInTheDocument();
  });

  it('has a left sidebar', () => {
    const { container } = renderHub();
    expect(container.querySelector('.refuge-hub__sidebar-left')).toBeInTheDocument();
  });

  it('has a center panel', () => {
    const { container } = renderHub();
    expect(container.querySelector('.refuge-hub__center')).toBeInTheDocument();
  });

  it('has a right sidebar', () => {
    const { container } = renderHub();
    expect(container.querySelector('.refuge-hub__sidebar-right')).toBeInTheDocument();
  });

  it('three-column structure: left, center, right all present', () => {
    const { container } = renderHub();
    const hub = container.querySelector('.refuge-hub')!;
    expect(hub.children).toHaveLength(3);
  });
});

// ─── Tab Navigation ──────────────────────────────────────────────────────────

describe('RefugeHub – Tabs', () => {
  it('renders a tablist', () => {
    renderHub();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders all 7 tabs', () => {
    renderHub();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(7);
  });

  it.each<RefugeTab>(['stash', 'loadout', 'crafting', 'marketplace', 'factions', 'contracts', 'shardboard'])(
    'renders the %s tab',
    (tabName) => {
      renderHub();
      expect(screen.getByRole('tab', { name: new RegExp(tabName, 'i') })).toBeInTheDocument();
    },
  );

  it('shows tabpanel for the active tab', () => {
    renderHub({ activeTab: 'stash' });
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderHub({ onTabChange });

    await user.click(screen.getByRole('tab', { name: /crafting/i }));
    expect(onTabChange).toHaveBeenCalledWith('crafting');
  });

  it('marks the active tab with aria-selected="true"', () => {
    renderHub({ activeTab: 'contracts' });
    expect(screen.getByRole('tab', { name: /contracts/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('marks inactive tabs with aria-selected="false"', () => {
    renderHub({ activeTab: 'stash' });
    expect(screen.getByRole('tab', { name: /crafting/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /factions/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('applies active class to the selected tab', () => {
    renderHub({ activeTab: 'marketplace' });
    const tab = screen.getByRole('tab', { name: /marketplace/i });
    expect(tab.classList.contains('refuge-nav__tab--active')).toBe(true);
  });

  it('fires onTabChange with correct tab id for each tab', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderHub({ onTabChange });

    await user.click(screen.getByRole('tab', { name: /loadout/i }));
    expect(onTabChange).toHaveBeenCalledWith('loadout');

    await user.click(screen.getByRole('tab', { name: /shardboard/i }));
    expect(onTabChange).toHaveBeenCalledWith('shardboard');
  });
});

// ─── Stash Panel ─────────────────────────────────────────────────────────────

describe('RefugeHub – Stash Panel', () => {
  it('shows Stash title when stash tab is active', () => {
    const { container } = renderHub({ activeTab: 'stash' });
    const panel = container.querySelector('.refuge-hub__center')!;
    expect(within(panel).getByText('Stash')).toBeInTheDocument();
  });

  it('has sort and filter controls', () => {
    renderHub({ activeTab: 'stash' });
    expect(screen.getByText('Sort')).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('renders stash items with tier-colored names', () => {
    const { container } = renderHub({ activeTab: 'stash' });
    expect(container.querySelector('.stash-item__name--common')).toBeInTheDocument();
    expect(container.querySelector('.stash-item__name--sturdy')).toBeInTheDocument();
  });

  it('renders durability bars as progressbars', () => {
    renderHub({ activeTab: 'stash' });
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThanOrEqual(2);
  });

  it('renders item weight values', () => {
    renderHub({ activeTab: 'stash' });
    expect(screen.getByText('3.2')).toBeInTheDocument();
    expect(screen.getByText('5.0')).toBeInTheDocument();
  });
});

// ─── Loadout Panel ───────────────────────────────────────────────────────────

describe('RefugeHub – Loadout Panel', () => {
  it('shows Loadout title when loadout tab is active', () => {
    const { container } = renderHub({ activeTab: 'loadout' });
    const panel = container.querySelector('.refuge-hub__center')!;
    expect(within(panel).getByText('Loadout')).toBeInTheDocument();
  });

  it('renders 13 equipment slots', () => {
    const { container } = renderHub({ activeTab: 'loadout' });
    const panel = container.querySelector('.refuge-hub__center')!;
    const slots = within(panel).getAllByRole('listitem');
    expect(slots).toHaveLength(13);
  });

  it('shows stats summary section', () => {
    renderHub({ activeTab: 'loadout' });
    expect(screen.getByText('Stats Summary')).toBeInTheDocument();
    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
  });
});

// ─── Crafting Panel ──────────────────────────────────────────────────────────

describe('RefugeHub – Crafting Panel', () => {
  it('shows Crafting title when crafting tab is active', () => {
    const { container } = renderHub({ activeTab: 'crafting' });
    const panel = container.querySelector('.refuge-hub__center')!;
    expect(within(panel).getByText('Crafting')).toBeInTheDocument();
  });

  it('has a recipe list', () => {
    renderHub({ activeTab: 'crafting' });
    expect(screen.getByText('Iron Dagger')).toBeInTheDocument();
    expect(screen.getByText('Healing Salve')).toBeInTheDocument();
  });

  it('shows selected recipe details with materials', () => {
    const { container } = renderHub({ activeTab: 'crafting' });
    const details = container.querySelector('.crafting__details')!;
    expect(within(details).getByText('Steel Sword')).toBeInTheDocument();
    expect(within(details).getByText('Steel Ingot')).toBeInTheDocument();
    expect(within(details).getByText('Leather Wrap')).toBeInTheDocument();
  });

  it('shows skill check requirement', () => {
    renderHub({ activeTab: 'crafting' });
    expect(screen.getByText('Smithing 15')).toBeInTheDocument();
  });

  it('has a Craft button', () => {
    renderHub({ activeTab: 'crafting' });
    expect(screen.getByText('Craft')).toBeInTheDocument();
  });
});

// ─── Marketplace Panel ───────────────────────────────────────────────────────

describe('RefugeHub – Marketplace Panel', () => {
  it('shows Marketplace title', () => {
    const { container } = renderHub({ activeTab: 'marketplace' });
    const panel = container.querySelector('.refuge-hub__center')!;
    expect(within(panel).getByText('Marketplace')).toBeInTheDocument();
  });

  it('renders a listings table', () => {
    renderHub({ activeTab: 'marketplace' });
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays table headers', () => {
    renderHub({ activeTab: 'marketplace' });
    expect(screen.getByText('Item Offered')).toBeInTheDocument();
    expect(screen.getByText('Item Wanted')).toBeInTheDocument();
    expect(screen.getByText('Seller')).toBeInTheDocument();
    expect(screen.getByText('Time Left')).toBeInTheDocument();
  });

  it('has Post Listing button', () => {
    renderHub({ activeTab: 'marketplace' });
    expect(screen.getByText('Post Listing')).toBeInTheDocument();
  });
});

// ─── Factions Panel ──────────────────────────────────────────────────────────

describe('RefugeHub – Factions Panel', () => {
  it('shows Factions title', () => {
    const { container } = renderHub({ activeTab: 'factions' });
    const panel = container.querySelector('.refuge-hub__center')!;
    expect(within(panel).getByText('Factions')).toBeInTheDocument();
  });

  it('displays faction name and description', () => {
    renderHub({ activeTab: 'factions' });
    expect(screen.getByText('The Forge Wardens')).toBeInTheDocument();
    expect(screen.getByText(/masters of metalcraft/i)).toBeInTheDocument();
  });

  it('has a reputation bar', () => {
    renderHub({ activeTab: 'factions' });
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
  });

  it('shows rank info', () => {
    renderHub({ activeTab: 'factions' });
    expect(screen.getByText('Initiate')).toBeInTheDocument();
  });

  it('shows available and locked perks', () => {
    const { container } = renderHub({ activeTab: 'factions' });
    expect(screen.getByText('Forge Access')).toBeInTheDocument();
    expect(container.querySelector('.faction-card__perk--locked')).toBeInTheDocument();
  });
});

// ─── Contracts Panel ─────────────────────────────────────────────────────────

describe('RefugeHub – Contracts Panel', () => {
  it('shows Contracts title', () => {
    const { container } = renderHub({ activeTab: 'contracts' });
    const panel = container.querySelector('.refuge-hub__center')!;
    expect(within(panel).getByText('Contracts')).toBeInTheDocument();
  });

  it('renders contract cards with objectives', () => {
    renderHub({ activeTab: 'contracts' });
    expect(screen.getByText('Retrieve the Lost Shard Fragment')).toBeInTheDocument();
    expect(screen.getByText('Clear the Collapsed Tunnels')).toBeInTheDocument();
  });

  it('shows reward and deadline info', () => {
    renderHub({ activeTab: 'contracts' });
    expect(screen.getByText(/50 Marks/)).toBeInTheDocument();
    expect(screen.getByText('3 Shard Runs')).toBeInTheDocument();
  });

  it('displays progress bar for active contracts', () => {
    renderHub({ activeTab: 'contracts' });
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThanOrEqual(1);
  });

  it('shows contract status labels', () => {
    renderHub({ activeTab: 'contracts' });
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});

// ─── Shardboard Panel ────────────────────────────────────────────────────────

describe('RefugeHub – Shardboard Panel', () => {
  it('shows Shardboard title', () => {
    const { container } = renderHub({ activeTab: 'shardboard' });
    const panel = container.querySelector('.refuge-hub__center')!;
    expect(within(panel).getByText('Shardboard')).toBeInTheDocument();
  });

  it('renders shard selection cards', () => {
    renderHub({ activeTab: 'shardboard' });
    expect(screen.getByText('Fractured Depths')).toBeInTheDocument();
    expect(screen.getByText('Ashen Reaches')).toBeInTheDocument();
  });

  it('shows tier and biome info', () => {
    renderHub({ activeTab: 'shardboard' });
    expect(screen.getByText('Tier 1')).toBeInTheDocument();
    expect(screen.getByText('Cavern')).toBeInTheDocument();
  });
});

// ─── Ambient Events ──────────────────────────────────────────────────────────

describe('RefugeHub – Ambient Events', () => {
  it('renders ambient-events-feed container', () => {
    const { container } = renderHub();
    expect(container.querySelector('.ambient-events-feed')).toBeInTheDocument();
  });

  it('displays ambient event text', () => {
    renderHub();
    expect(screen.getByText(/merchant arrives from the eastern road/i)).toBeInTheDocument();
  });

  it('displays NPC names in ambient events', () => {
    renderHub();
    expect(screen.getByText('Merchant Kael')).toBeInTheDocument();
    expect(screen.getByText('Forge Warden')).toBeInTheDocument();
  });

  it('appends new events to the feed', () => {
    const events = [
      { id: 'e1', text: 'First event', npc: 'NPC1' },
      { id: 'e2', text: 'Second event', npc: 'NPC2' },
      { id: 'e3', text: 'Third event', npc: 'NPC3' },
    ];
    renderHub({ ambientEvents: events });
    expect(screen.getByText('First event')).toBeInTheDocument();
    expect(screen.getByText('Third event')).toBeInTheDocument();
  });

  it('handles empty events array', () => {
    const { container } = renderHub({ ambientEvents: [] });
    const feed = container.querySelector('.ambient-events-feed')!;
    expect(feed.querySelectorAll('.ambient-event')).toHaveLength(0);
  });
});

// ─── Chat Panel ──────────────────────────────────────────────────────────────

describe('RefugeHub – Chat Panel', () => {
  it('renders a chat input', () => {
    renderHub();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders chat message history', () => {
    renderHub();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Looking to trade?')).toBeInTheDocument();
  });

  it('shows sender names in messages', () => {
    renderHub();
    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('Trader Vex')).toBeInTheDocument();
  });

  it('renders a Send button', () => {
    renderHub();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('calls onChatSend when Send is clicked with text', async () => {
    const user = userEvent.setup();
    const onChatSend = vi.fn();
    renderHub({ onChatSend });

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hi there');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onChatSend).toHaveBeenCalledWith('Hi there');
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    renderHub();

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, 'test message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(input.value).toBe('');
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    const onChatSend = vi.fn();
    renderHub({ onChatSend });

    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(onChatSend).not.toHaveBeenCalled();
  });

  it('sends on Enter key press', async () => {
    const user = userEvent.setup();
    const onChatSend = vi.fn();
    renderHub({ onChatSend });

    const input = screen.getByRole('textbox');
    await user.type(input, 'Enter pressed{enter}');

    expect(onChatSend).toHaveBeenCalledWith('Enter pressed');
  });

  it('handles empty chat messages array', () => {
    const { container } = renderHub({ chatMessages: [] });
    const msgs = container.querySelector('.chat-panel__messages')!;
    expect(msgs.querySelectorAll('.chat-message')).toHaveLength(0);
  });
});

// ─── Social Panel ────────────────────────────────────────────────────────────

describe('RefugeHub – Social Panel', () => {
  it('shows Players Nearby section', () => {
    renderHub();
    expect(screen.getByText('Players Nearby')).toBeInTheDocument();
  });

  it('shows Trade Requests section', () => {
    renderHub();
    expect(screen.getByText('Trade Requests')).toBeInTheDocument();
  });
});
