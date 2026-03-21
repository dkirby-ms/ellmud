import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefugeHub } from '../components/RefugeHub.js';
import { AppContext, initialState, type AppContextValue } from '../store.js';

vi.mock('../services/connection.js');

const defaultProps = {
  activeTab: 'stash' as const,
  ambientEvents: [
    { id: 'e1', text: 'A merchant arrives from the eastern road.', npc: 'Merchant Kael' },
    { id: 'e2', text: 'The blacksmith hammers on a glowing blade.', npc: 'Forge Warden' },
  ],
  chatMessages: [
    { id: 'm1', sender: 'Player1', text: 'Hello!', timestamp: Date.now() },
  ],
  onTabChange: vi.fn(),
  onChatSend: vi.fn(),
};

function renderHub(propsOverride = {}, dispatch = vi.fn()) {
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

describe('RefugeHub – Layout', () => {
  it('renders with refuge-hub CSS class', () => {
    const { container } = renderHub();
    expect(container.querySelector('.refuge-hub')).toBeInTheDocument();
  });

  it('has a left sidebar', () => {
    const { container } = renderHub();
    expect(container.querySelector('.refuge-hub__sidebar-left') ?? container.querySelector('.refuge-hub__left')).toBeInTheDocument();
  });

  it('has a center panel', () => {
    const { container } = renderHub();
    expect(container.querySelector('.refuge-hub__center') ?? container.querySelector('.refuge-hub__main')).toBeInTheDocument();
  });

  it('has a right panel', () => {
    const { container } = renderHub();
    expect(container.querySelector('.refuge-hub__sidebar-right') ?? container.querySelector('.refuge-hub__right')).toBeInTheDocument();
  });
});

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

  it.each(['stash', 'forge', 'contracts', 'lore', 'shop', 'social', 'settings'])(
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

    await user.click(screen.getByRole('tab', { name: /forge/i }));
    expect(onTabChange).toHaveBeenCalledWith('forge');
  });

  it('marks the active tab with aria-selected="true"', () => {
    renderHub({ activeTab: 'contracts' });
    expect(screen.getByRole('tab', { name: /contracts/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('marks inactive tabs with aria-selected="false"', () => {
    renderHub({ activeTab: 'stash' });
    expect(screen.getByRole('tab', { name: /forge/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('changes tabpanel content when a different tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderHub({ activeTab: 'stash', onTabChange });

    await user.click(screen.getByRole('tab', { name: /lore/i }));
    expect(onTabChange).toHaveBeenCalledWith('lore');
  });
});

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
    expect(screen.getByText(/Merchant Kael/)).toBeInTheDocument();
    expect(screen.getByText(/Forge Warden/)).toBeInTheDocument();
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
});

describe('RefugeHub – Chat Panel', () => {
  it('renders a chat input at the bottom', () => {
    renderHub();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders a message history area', () => {
    renderHub();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('renders a "Send" button', () => {
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
});
