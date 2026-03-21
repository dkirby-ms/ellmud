import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShardCard } from '../components/ShardCard.js';
import { ShardboardGrid } from '../components/ShardboardGrid.js';
import type { ShardCardData } from '@ellmud/shared';

function makeCard(overrides: Partial<ShardCardData> = {}): ShardCardData {
  return {
    shardId: 'shard-001',
    name: 'Sunken Cathedral',
    tier: 1,
    biome: 'sunken_cathedral',
    modifiers: [],
    currentPlayers: 2,
    maxPlayers: 4,
    entryWindowSeconds: 120,
    keyCost: 'bone',
    ...overrides,
  };
}

vi.mock('../services/connection.js');

describe('ShardCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the shard name', () => {
    render(<ShardCard card={makeCard({ name: 'Obsidian Halls' })} onEnter={vi.fn()} />);
    expect(screen.getByText('Obsidian Halls')).toBeInTheDocument();
  });

  it('displays tier 1 badge as T1', () => {
    render(<ShardCard card={makeCard({ tier: 1 })} onEnter={vi.fn()} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
  });

  it('displays tier 2 badge as T2', () => {
    render(<ShardCard card={makeCard({ tier: 2 })} onEnter={vi.fn()} />);
    expect(screen.getByText('T2')).toBeInTheDocument();
  });

  it('displays tier 3 badge as T3', () => {
    render(<ShardCard card={makeCard({ tier: 3 })} onEnter={vi.fn()} />);
    expect(screen.getByText('T3')).toBeInTheDocument();
  });

  it('applies shard-tier--white CSS class for tier 1', () => {
    const { container } = render(<ShardCard card={makeCard({ tier: 1 })} onEnter={vi.fn()} />);
    expect(container.querySelector('.shard-tier--white')).toBeInTheDocument();
  });

  it('applies shard-tier--blue CSS class for tier 2', () => {
    const { container } = render(<ShardCard card={makeCard({ tier: 2 })} onEnter={vi.fn()} />);
    expect(container.querySelector('.shard-tier--blue')).toBeInTheDocument();
  });

  it('applies shard-tier--purple CSS class for tier 3', () => {
    const { container } = render(<ShardCard card={makeCard({ tier: 3 })} onEnter={vi.fn()} />);
    expect(container.querySelector('.shard-tier--purple')).toBeInTheDocument();
  });

  it('displays biome label for sunken_cathedral', () => {
    render(<ShardCard card={makeCard({ biome: 'sunken_cathedral' })} onEnter={vi.fn()} />);
    expect(screen.getByText(/sunken cathedral/i)).toBeInTheDocument();
  });

  it('displays biome label for fungal_grove', () => {
    render(<ShardCard card={makeCard({ biome: 'fungal_grove' })} onEnter={vi.fn()} />);
    expect(screen.getByText(/fungal grove/i)).toBeInTheDocument();
  });

  it('displays biome label for obsidian_halls', () => {
    render(<ShardCard card={makeCard({ biome: 'obsidian_halls' })} onEnter={vi.fn()} />);
    expect(screen.getByText(/obsidian halls/i)).toBeInTheDocument();
  });

  it('renders modifier tags when modifiers are present', () => {
    const card = makeCard({
      modifiers: [
        { id: 'mod-1', name: 'Cursed', description: 'Reduced healing' },
        { id: 'mod-2', name: 'Fortified', description: 'Enemies have more HP' },
      ],
    });
    render(<ShardCard card={card} onEnter={vi.fn()} />);
    expect(screen.getByText('Cursed')).toBeInTheDocument();
    expect(screen.getByText('Fortified')).toBeInTheDocument();
  });

  it('renders no modifier tags when modifiers array is empty', () => {
    const { container } = render(<ShardCard card={makeCard({ modifiers: [] })} onEnter={vi.fn()} />);
    expect(container.querySelector('.shard-modifier')).not.toBeInTheDocument();
  });

  it('displays player slot counter as currentPlayers/maxPlayers', () => {
    render(<ShardCard card={makeCard({ currentPlayers: 3, maxPlayers: 4 })} onEnter={vi.fn()} />);
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });

  it('displays countdown timer from entry window seconds', () => {
    render(<ShardCard card={makeCard({ entryWindowSeconds: 90 })} onEnter={vi.fn()} />);
    expect(screen.getByText(/1:30/)).toBeInTheDocument();
  });

  it('decrements countdown timer over time', () => {
    render(<ShardCard card={makeCard({ entryWindowSeconds: 60 })} onEnter={vi.fn()} />);
    expect(screen.getByText(/1:00/)).toBeInTheDocument();

    vi.advanceTimersByTime(10_000);
    expect(screen.getByText(/0:50/)).toBeInTheDocument();
  });

  it('renders "Enter Shard" button', () => {
    render(<ShardCard card={makeCard()} onEnter={vi.fn()} />);
    expect(screen.getByRole('button', { name: /enter shard/i })).toBeInTheDocument();
  });

  it('calls onEnter with shardId when button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onEnter = vi.fn();
    render(<ShardCard card={makeCard({ shardId: 'shard-42' })} onEnter={onEnter} />);

    await user.click(screen.getByRole('button', { name: /enter shard/i }));
    expect(onEnter).toHaveBeenCalledWith('shard-42');
  });

  it('calls onEnter with shardId on keyboard Enter', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onEnter = vi.fn();
    render(<ShardCard card={makeCard({ shardId: 'shard-99' })} onEnter={onEnter} />);

    const button = screen.getByRole('button', { name: /enter shard/i });
    button.focus();
    await user.keyboard('{Enter}');
    expect(onEnter).toHaveBeenCalledWith('shard-99');
  });

  it('displays bone key cost badge', () => {
    render(<ShardCard card={makeCard({ keyCost: 'bone' })} onEnter={vi.fn()} />);
    expect(screen.getByText(/bone/i)).toBeInTheDocument();
  });

  it('displays iron key cost badge', () => {
    render(<ShardCard card={makeCard({ keyCost: 'iron' })} onEnter={vi.fn()} />);
    expect(screen.getByText(/iron/i)).toBeInTheDocument();
  });

  it('displays crystal key cost badge', () => {
    render(<ShardCard card={makeCard({ keyCost: 'crystal' })} onEnter={vi.fn()} />);
    expect(screen.getByText(/crystal/i)).toBeInTheDocument();
  });

  it('displays void key cost badge', () => {
    render(<ShardCard card={makeCard({ keyCost: 'void' })} onEnter={vi.fn()} />);
    expect(screen.getByText(/void/i)).toBeInTheDocument();
  });

  it('disables entry button when slots are full', () => {
    render(<ShardCard card={makeCard({ currentPlayers: 4, maxPlayers: 4 })} onEnter={vi.fn()} />);
    expect(screen.getByRole('button', { name: /enter shard/i })).toBeDisabled();
  });

  it('does not call onEnter when slots are full and button clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onEnter = vi.fn();
    render(<ShardCard card={makeCard({ currentPlayers: 4, maxPlayers: 4 })} onEnter={onEnter} />);

    await user.click(screen.getByRole('button', { name: /enter shard/i }));
    expect(onEnter).not.toHaveBeenCalled();
  });

  it('renders as an article element', () => {
    render(<ShardCard card={makeCard()} onEnter={vi.fn()} />);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('includes shard name in article accessible name', () => {
    render(<ShardCard card={makeCard({ name: 'Fungal Grove' })} onEnter={vi.fn()} />);
    const article = screen.getByRole('article');
    expect(article).toHaveAccessibleName(/fungal grove/i);
  });

  it('shows full slots indicator text when maxed', () => {
    render(<ShardCard card={makeCard({ currentPlayers: 4, maxPlayers: 4 })} onEnter={vi.fn()} />);
    expect(screen.getByText(/full/i)).toBeInTheDocument();
  });

  it('displays entry window as 2:00 for 120 seconds', () => {
    render(<ShardCard card={makeCard({ entryWindowSeconds: 120 })} onEnter={vi.fn()} />);
    expect(screen.getByText(/2:00/)).toBeInTheDocument();
  });

  it('renders modifier description as tooltip or title', () => {
    const card = makeCard({
      modifiers: [{ id: 'mod-1', name: 'Cursed', description: 'Reduced healing' }],
    });
    render(<ShardCard card={card} onEnter={vi.fn()} />);
    expect(screen.getByText('Cursed').closest('[title]') ?? screen.getByTitle('Reduced healing')).toBeInTheDocument();
  });

  it('enables entry button when slots are available', () => {
    render(<ShardCard card={makeCard({ currentPlayers: 1, maxPlayers: 4 })} onEnter={vi.fn()} />);
    expect(screen.getByRole('button', { name: /enter shard/i })).toBeEnabled();
  });

  it('renders multiple modifiers as separate tags', () => {
    const card = makeCard({
      modifiers: [
        { id: 'm1', name: 'Toxic', description: 'Poison damage' },
        { id: 'm2', name: 'Dense', description: 'More enemies' },
        { id: 'm3', name: 'Dark', description: 'Reduced vision' },
      ],
    });
    const { container } = render(<ShardCard card={card} onEnter={vi.fn()} />);
    const tags = container.querySelectorAll('.shard-modifier');
    expect(tags.length).toBe(3);
  });

  it('displays 0:00 when entry window is zero', () => {
    render(<ShardCard card={makeCard({ entryWindowSeconds: 0 })} onEnter={vi.fn()} />);
    expect(screen.getByText(/0:00/)).toBeInTheDocument();
  });

  it('shows player count even when empty', () => {
    render(<ShardCard card={makeCard({ currentPlayers: 0, maxPlayers: 4 })} onEnter={vi.fn()} />);
    expect(screen.getByText('0/4')).toBeInTheDocument();
  });

  it('applies shard-card CSS class to the root', () => {
    const { container } = render(<ShardCard card={makeCard()} onEnter={vi.fn()} />);
    expect(container.querySelector('.shard-card')).toBeInTheDocument();
  });

  it('displays key cost with a badge element', () => {
    const { container } = render(<ShardCard card={makeCard({ keyCost: 'crystal' })} onEnter={vi.fn()} />);
    expect(container.querySelector('.shard-key-cost')).toBeInTheDocument();
  });
});

describe('ShardboardGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the correct number of ShardCards', () => {
    const cards = [
      makeCard({ shardId: 's1', name: 'Shard A' }),
      makeCard({ shardId: 's2', name: 'Shard B' }),
      makeCard({ shardId: 's3', name: 'Shard C' }),
    ];
    render(<ShardboardGrid cards={cards} onEnter={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('displays "No shards available" when cards array is empty', () => {
    render(<ShardboardGrid cards={[]} onEnter={vi.fn()} />);
    expect(screen.getByText(/no shards available/i)).toBeInTheDocument();
  });

  it('renders with grid role', () => {
    const cards = [makeCard({ shardId: 's1' })];
    render(<ShardboardGrid cards={cards} onEnter={vi.fn()} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('passes onEnter callback to each ShardCard', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onEnter = vi.fn();
    const cards = [
      makeCard({ shardId: 'first-shard', name: 'First Shard' }),
      makeCard({ shardId: 'second-shard', name: 'Second Shard' }),
    ];
    render(<ShardboardGrid cards={cards} onEnter={onEnter} />);

    const buttons = screen.getAllByRole('button', { name: /enter shard/i });
    await user.click(buttons[0]);
    expect(onEnter).toHaveBeenCalledWith('first-shard');
  });

  it('renders all shard names in the grid', () => {
    const cards = [
      makeCard({ shardId: 's1', name: 'Alpha Shard' }),
      makeCard({ shardId: 's2', name: 'Beta Shard' }),
    ];
    render(<ShardboardGrid cards={cards} onEnter={vi.fn()} />);
    expect(screen.getByText('Alpha Shard')).toBeInTheDocument();
    expect(screen.getByText('Beta Shard')).toBeInTheDocument();
  });

  it('applies shardboard-grid CSS class', () => {
    const { container } = render(<ShardboardGrid cards={[makeCard()]} onEnter={vi.fn()} />);
    expect(container.querySelector('.shardboard-grid')).toBeInTheDocument();
  });

  it('supports keyboard navigation placeholder on grid', () => {
    const cards = [makeCard({ shardId: 's1' }), makeCard({ shardId: 's2' })];
    const { container } = render(<ShardboardGrid cards={cards} onEnter={vi.fn()} />);
    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('tabIndex');
  });
});
