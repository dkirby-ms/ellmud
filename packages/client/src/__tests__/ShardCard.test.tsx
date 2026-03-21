import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// [SKIPPED] import { ShardCard } from '../components/_old/ShardCard.js';
import type { ShardCardData } from '@ellmud/shared';

function makeShard(overrides: Partial<ShardCardData> = {}): ShardCardData {
  return {
    shardId: 'shard-1',
    name: 'Ashen Reach — Flooded Crypt',
    tier: 1,
    biome: 'flooded_crypt',
    modifiers: ['hunted', 'darkness'],
    currentPlayers: 2,
    maxPlayers: 4,
    entryWindowSeconds: 600,
    keyCost: 'bone',
    ...overrides,
  };
}

function renderCard(
  overrides: Partial<ShardCardData> = {},
  onEnter: (id: string) => void = vi.fn(),
) {
  const shard = makeShard(overrides);
  return render(<ShardCard shard={shard} onEnter={onEnter} />);
}

// TODO: ShardCard.tsx moved to _old/ during UX overhaul. Shard cards are now part of ShardboardTab component.
// Rewrite tests for new card implementation.
describe.skip('ShardCard', () => {
  // ─── Layout ────────────────────────────────────────────────────────────

  it('renders shard name', () => {
    renderCard({ name: 'Shattered Bastion — Deep Ward' });
    expect(screen.getByText('Shattered Bastion — Deep Ward')).toBeInTheDocument();
  });

  it('renders article with aria-label', () => {
    renderCard({ name: 'Test Shard' });
    expect(screen.getByRole('article', { name: 'Shard: Test Shard' })).toBeInTheDocument();
  });

  // ─── Tier Badges ───────────────────────────────────────────────────────

  it('renders Tier 1 badge with white class', () => {
    renderCard({ tier: 1 });
    const badge = screen.getByText('Tier 1');
    expect(badge).toHaveClass('shard-tier--white');
  });

  it('renders Tier 2 badge with blue class', () => {
    renderCard({ tier: 2 });
    const badge = screen.getByText('Tier 2');
    expect(badge).toHaveClass('shard-tier--blue');
  });

  it('renders Tier 3 badge with purple class', () => {
    renderCard({ tier: 3 });
    const badge = screen.getByText('Tier 3');
    expect(badge).toHaveClass('shard-tier--purple');
  });

  // ─── Biome Icons ───────────────────────────────────────────────────────

  it('renders biome label for flooded_crypt', () => {
    renderCard({ biome: 'flooded_crypt' });
    expect(screen.getByText('Flooded Crypt')).toBeInTheDocument();
  });

  it('renders biome label for shattered_bastion', () => {
    renderCard({ biome: 'shattered_bastion' });
    expect(screen.getByText('Shattered Bastion')).toBeInTheDocument();
  });

  it('renders biome label for fungal_deep', () => {
    renderCard({ biome: 'fungal_deep' });
    expect(screen.getByText('Fungal Deep')).toBeInTheDocument();
  });

  it('renders biome label for ashen_reach', () => {
    renderCard({ biome: 'ashen_reach' });
    expect(screen.getByText('Ember Rift')).toBeInTheDocument();
  });

  it('renders biome label for void_rift', () => {
    renderCard({ biome: 'void_rift' });
    expect(screen.getByText('Hollow Archive')).toBeInTheDocument();
  });

  // ─── Modifiers ─────────────────────────────────────────────────────────

  it('renders modifier tags', () => {
    renderCard({ modifiers: ['hunted', 'darkness', 'bountiful'] });
    expect(screen.getByText('Hunted')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Bountiful')).toBeInTheDocument();
  });

  it('renders modifier list with role', () => {
    renderCard({ modifiers: ['silent'] });
    expect(screen.getByRole('list', { name: 'Shard modifiers' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Silent');
  });

  it('hides modifier section when empty', () => {
    renderCard({ modifiers: [] });
    expect(screen.queryByRole('list', { name: 'Shard modifiers' })).not.toBeInTheDocument();
  });

  // ─── Player Slots ──────────────────────────────────────────────────────

  it('renders correct number of slot indicators', () => {
    const { container } = renderCard({ currentPlayers: 2, maxPlayers: 4 });
    const slots = container.querySelectorAll('.shard-card__slot');
    expect(slots).toHaveLength(4);
  });

  it('marks filled slots', () => {
    const { container } = renderCard({ currentPlayers: 3, maxPlayers: 4 });
    const filled = container.querySelectorAll('.shard-card__slot--filled');
    expect(filled).toHaveLength(3);
  });

  it('shows player count text', () => {
    renderCard({ currentPlayers: 2, maxPlayers: 4 });
    expect(screen.getByText('2/4 players')).toBeInTheDocument();
  });

  it('has accessible label for player slots', () => {
    renderCard({ currentPlayers: 1, maxPlayers: 4 });
    expect(screen.getByLabelText('1 of 4 players entered')).toBeInTheDocument();
  });

  // ─── Time Remaining ────────────────────────────────────────────────────

  it('displays formatted countdown', () => {
    renderCard({ entryWindowSeconds: 600 });
    expect(screen.getByLabelText('10:00 remaining')).toBeInTheDocument();
  });

  it('applies urgent class when under 5 minutes', () => {
    const { container } = renderCard({ entryWindowSeconds: 299 });
    const time = container.querySelector('.shard-card__time');
    expect(time).toHaveClass('shard-card__time--urgent');
  });

  it('countdown updates every second', () => {
    vi.useFakeTimers();
    renderCard({ entryWindowSeconds: 10 });
    expect(screen.getByLabelText('0:10 remaining')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByLabelText('0:07 remaining')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows Closed when timer reaches zero', () => {
    vi.useFakeTimers();
    renderCard({ entryWindowSeconds: 2 });

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('Closed')).toBeInTheDocument();
    vi.useRealTimers();
  });

  // ─── Key Cost ──────────────────────────────────────────────────────────

  it('displays shard key cost', () => {
    renderCard({ keyCost: 'iron' });
    expect(screen.getByText('Iron Key')).toBeInTheDocument();
  });

  it('displays crystal key cost', () => {
    renderCard({ keyCost: 'crystal' });
    expect(screen.getByText('Crystal Key')).toBeInTheDocument();
  });

  // ─── Enter Button ──────────────────────────────────────────────────────

  it('calls onEnter with shardId when clicked', async () => {
    const user = userEvent.setup();
    const onEnter = vi.fn();
    renderCard({ shardId: 'shard-42' }, onEnter);

    await user.click(screen.getByRole('button', { name: /enter shard/i }));
    expect(onEnter).toHaveBeenCalledWith('shard-42');
  });

  it('disables enter button when expired', () => {
    renderCard({ entryWindowSeconds: 0 });
    expect(screen.getByRole('button', { name: /enter shard/i })).toBeDisabled();
  });

  it('does not call onEnter when expired', async () => {
    const user = userEvent.setup();
    const onEnter = vi.fn();
    renderCard({ entryWindowSeconds: 0 }, onEnter);

    await user.click(screen.getByRole('button', { name: /enter shard/i }));
    expect(onEnter).not.toHaveBeenCalled();
  });

  // ─── Keyboard Accessibility ────────────────────────────────────────────

  it('card is focusable via tab', () => {
    renderCard();
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  it('Enter key on card triggers onEnter', async () => {
    const user = userEvent.setup();
    const onEnter = vi.fn();
    renderCard({ shardId: 'shard-kb' }, onEnter);

    const card = screen.getByRole('article');
    card.focus();
    await user.keyboard('{Enter}');
    expect(onEnter).toHaveBeenCalledWith('shard-kb');
  });

  it('Space key on card triggers onEnter', async () => {
    const user = userEvent.setup();
    const onEnter = vi.fn();
    renderCard({ shardId: 'shard-sp' }, onEnter);

    const card = screen.getByRole('article');
    card.focus();
    await user.keyboard(' ');
    expect(onEnter).toHaveBeenCalledWith('shard-sp');
  });
});
