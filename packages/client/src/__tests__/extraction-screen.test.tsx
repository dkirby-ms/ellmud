import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtractionOverlay } from '../components/ExtractionOverlay.js';
import { ExtractionSuccess } from '../components/ExtractionSuccess.js';
import { ExtractionFailure } from '../components/ExtractionFailure.js';
import { ExtractionScreen } from '../components/ExtractionScreen.js';
import type { LootItem, RunSummary, StashStats } from '../components/extraction-types.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseSummary: RunSummary = {
  timeInShard: 342,
  roomsExplored: 8,
  creaturesDefeated: 5,
  damageTaken: 120,
  reputationGained: 15,
};

const sampleLoot: LootItem[] = [
  { id: 'l1', name: 'Iron Sword', quantity: 1, tier: 'common' },
  { id: 'l2', name: 'Crystal Shard', quantity: 3, tier: 'anomalous' },
  { id: 'l3', name: 'Sturdy Shield', quantity: 1, tier: 'sturdy' },
  { id: 'l4', name: 'Refined Helm', quantity: 1, tier: 'refined' },
  { id: 'l5', name: 'Masterwork Bow', quantity: 1, tier: 'masterwork' },
];

const sampleStash: StashStats = {
  totalValue: 4500,
  weightBefore: 85,
  weightAfter: 112,
};

// ─── ExtractionOverlay ──────────────────────────────────────────────────────

// TODO: ExtractionScreen.tsx and related components moved to _old/ during UX overhaul. Extraction UI is now ExtractionOverlay with new API.
// Rewrite tests for new ExtractionOverlay component.
describe.skip('ExtractionOverlay', () => {
  it('renders with extraction-overlay class', () => {
    const { container } = render(
      <ExtractionOverlay ticksRemaining={3} totalTicks={5} narration="Hold steady..." />,
    );
    expect(container.querySelector('.extraction-overlay')).toBeInTheDocument();
  });

  it('displays "Extracting..." title while in progress', () => {
    render(<ExtractionOverlay ticksRemaining={3} totalTicks={5} narration="Hold steady..." />);
    expect(screen.getByText('Extracting...')).toBeInTheDocument();
  });

  it('displays "Extraction Complete" when ticks reach 0', () => {
    render(<ExtractionOverlay ticksRemaining={0} totalTicks={5} narration="Done." />);
    expect(screen.getByText('Extraction Complete')).toBeInTheDocument();
  });

  it('renders a progress bar with progressbar role', () => {
    render(<ExtractionOverlay ticksRemaining={3} totalTicks={5} narration="Hold steady..." />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to the correct percentage', () => {
    render(<ExtractionOverlay ticksRemaining={2} totalTicks={5} narration="..." />);
    // (5 - 2) / 5 = 60%
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  });

  it('sets aria-valuemax to 100', () => {
    render(<ExtractionOverlay ticksRemaining={3} totalTicks={5} narration="..." />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays the countdown in seconds', () => {
    render(<ExtractionOverlay ticksRemaining={4} totalTicks={5} narration="..." />);
    expect(screen.getByText('4s remaining')).toBeInTheDocument();
  });

  it('displays "Complete" when ticks reach 0', () => {
    render(<ExtractionOverlay ticksRemaining={0} totalTicks={5} narration="..." />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('displays the narration text', () => {
    render(
      <ExtractionOverlay ticksRemaining={3} totalTicks={5} narration="The void hums around you." />,
    );
    expect(screen.getByText('The void hums around you.')).toBeInTheDocument();
  });

  it('renders a cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(
      <ExtractionOverlay ticksRemaining={3} totalTicks={5} narration="..." onCancel={onCancel} />,
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ExtractionOverlay ticksRemaining={3} totalTicks={5} narration="..." onCancel={onCancel} />,
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('hides cancel button when extraction completes', () => {
    const onCancel = vi.fn();
    render(
      <ExtractionOverlay ticksRemaining={0} totalTicks={5} narration="Done." onCancel={onCancel} />,
    );
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('adds --complete modifier class when done', () => {
    const { container } = render(
      <ExtractionOverlay ticksRemaining={0} totalTicks={5} narration="Done." />,
    );
    expect(container.querySelector('.extraction-overlay--complete')).toBeInTheDocument();
  });

  it('has an aria-live region for accessibility', () => {
    const { container } = render(
      <ExtractionOverlay ticksRemaining={3} totalTicks={5} narration="..." />,
    );
    expect(container.querySelector('[aria-live]')).toBeInTheDocument();
  });
});

// ─── ExtractionSuccess ──────────────────────────────────────────────────────

describe.skip('ExtractionSuccess', () => {
  const defaultProps = {
    items: sampleLoot,
    summary: baseSummary,
    stash: sampleStash,
    onReturn: vi.fn(),
  };

  it('renders with extraction-screen class', () => {
    const { container } = render(<ExtractionSuccess {...defaultProps} />);
    expect(container.querySelector('.extraction-screen')).toBeInTheDocument();
  });

  it('renders with --success modifier', () => {
    const { container } = render(<ExtractionSuccess {...defaultProps} />);
    expect(container.querySelector('.extraction-screen--success')).toBeInTheDocument();
  });

  it('displays "Extraction Successful" heading', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /extraction successful/i })).toBeInTheDocument();
  });

  it('displays the subtitle', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByText('You escaped the shard.')).toBeInTheDocument();
  });

  it('renders all loot items', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Crystal Shard')).toBeInTheDocument();
    expect(screen.getByText('Sturdy Shield')).toBeInTheDocument();
    expect(screen.getByText('Refined Helm')).toBeInTheDocument();
    expect(screen.getByText('Masterwork Bow')).toBeInTheDocument();
  });

  it('displays quantity for stacked items', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByText('×3')).toBeInTheDocument();
  });

  it('applies loot-tier--common class', () => {
    const { container } = render(<ExtractionSuccess {...defaultProps} />);
    expect(container.querySelector('.loot-tier--common')).toBeInTheDocument();
  });

  it('applies loot-tier--sturdy class', () => {
    const { container } = render(<ExtractionSuccess {...defaultProps} />);
    expect(container.querySelector('.loot-tier--sturdy')).toBeInTheDocument();
  });

  it('applies loot-tier--refined class', () => {
    const { container } = render(<ExtractionSuccess {...defaultProps} />);
    expect(container.querySelector('.loot-tier--refined')).toBeInTheDocument();
  });

  it('applies loot-tier--masterwork class', () => {
    const { container } = render(<ExtractionSuccess {...defaultProps} />);
    expect(container.querySelector('.loot-tier--masterwork')).toBeInTheDocument();
  });

  it('applies loot-tier--anomalous class', () => {
    const { container } = render(<ExtractionSuccess {...defaultProps} />);
    expect(container.querySelector('.loot-tier--anomalous')).toBeInTheDocument();
  });

  it('displays time in shard formatted', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    // 342 seconds → 5m 42s
    expect(screen.getByText('5m 42s')).toBeInTheDocument();
  });

  it('displays rooms explored stat', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    const section = screen.getByLabelText('Run summary');
    expect(within(section).getByText('8')).toBeInTheDocument();
  });

  it('displays creatures defeated stat', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    const section = screen.getByLabelText('Run summary');
    expect(within(section).getByText('5')).toBeInTheDocument();
  });

  it('displays damage taken stat', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('displays reputation gained stat', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByText('+15')).toBeInTheDocument();
  });

  it('displays stash total value', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByText('4,500')).toBeInTheDocument();
  });

  it('displays weight before/after', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByText('85 → 112')).toBeInTheDocument();
  });

  it('renders "Return to Refuge" button', () => {
    render(<ExtractionSuccess {...defaultProps} />);
    expect(screen.getByRole('button', { name: /return to refuge/i })).toBeInTheDocument();
  });

  it('calls onReturn when return button is clicked', async () => {
    const user = userEvent.setup();
    const onReturn = vi.fn();
    render(<ExtractionSuccess {...defaultProps} onReturn={onReturn} />);
    await user.click(screen.getByRole('button', { name: /return to refuge/i }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('shows empty message when no items extracted', () => {
    render(<ExtractionSuccess {...defaultProps} items={[]} />);
    expect(screen.getByText('No items extracted.')).toBeInTheDocument();
  });

  it('has an aria-live region', () => {
    const { container } = render(<ExtractionSuccess {...defaultProps} />);
    expect(container.querySelector('[aria-live]')).toBeInTheDocument();
  });
});

// ─── ExtractionFailure ──────────────────────────────────────────────────────

describe.skip('ExtractionFailure', () => {
  const lostItems: LootItem[] = [
    { id: 'l1', name: 'Iron Sword', quantity: 1, tier: 'common' },
    { id: 'l2', name: 'Healing Salve', quantity: 5, tier: 'common' },
  ];

  const defaultProps = {
    itemsLost: lostItems,
    debuffs: ['Shard-sickness: -25% stats for next run'],
    summary: baseSummary,
    onReturn: vi.fn(),
  };

  it('renders with extraction-screen class', () => {
    const { container } = render(<ExtractionFailure {...defaultProps} />);
    expect(container.querySelector('.extraction-screen')).toBeInTheDocument();
  });

  it('renders with --failure modifier', () => {
    const { container } = render(<ExtractionFailure {...defaultProps} />);
    expect(container.querySelector('.extraction-screen--failure')).toBeInTheDocument();
  });

  it('displays the failure heading', () => {
    render(<ExtractionFailure {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /lost in the shard/i })).toBeInTheDocument();
  });

  it('displays the subtitle', () => {
    render(<ExtractionFailure {...defaultProps} />);
    expect(screen.getByText('Your gear is gone.')).toBeInTheDocument();
  });

  it('renders lost items', () => {
    render(<ExtractionFailure {...defaultProps} />);
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Healing Salve')).toBeInTheDocument();
  });

  it('displays quantity for stacked lost items', () => {
    render(<ExtractionFailure {...defaultProps} />);
    expect(screen.getByText('×5')).toBeInTheDocument();
  });

  it('renders debuffs', () => {
    render(<ExtractionFailure {...defaultProps} />);
    expect(screen.getByText('Shard-sickness: -25% stats for next run')).toBeInTheDocument();
  });

  it('renders run summary on failure', () => {
    render(<ExtractionFailure {...defaultProps} />);
    expect(screen.getByText('5m 42s')).toBeInTheDocument();
  });

  it('renders "Return to Refuge" button', () => {
    render(<ExtractionFailure {...defaultProps} />);
    expect(screen.getByRole('button', { name: /return to refuge/i })).toBeInTheDocument();
  });

  it('calls onReturn when return button is clicked', async () => {
    const user = userEvent.setup();
    const onReturn = vi.fn();
    render(<ExtractionFailure {...defaultProps} onReturn={onReturn} />);
    await user.click(screen.getByRole('button', { name: /return to refuge/i }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('hides items lost section when array is empty', () => {
    render(<ExtractionFailure {...defaultProps} itemsLost={[]} />);
    expect(screen.queryByLabelText('Items lost')).not.toBeInTheDocument();
  });

  it('hides debuffs section when array is empty', () => {
    render(<ExtractionFailure {...defaultProps} debuffs={[]} />);
    expect(screen.queryByLabelText('Debuffs applied')).not.toBeInTheDocument();
  });

  it('has an aria-live region', () => {
    const { container } = render(<ExtractionFailure {...defaultProps} />);
    expect(container.querySelector('[aria-live]')).toBeInTheDocument();
  });
});

// ─── ExtractionScreen (unified) ─────────────────────────────────────────────

describe.skip('ExtractionScreen — phase routing', () => {
  it('renders ExtractionOverlay for extracting phase', () => {
    const { container } = render(
      <ExtractionScreen
        phase="extracting"
        ticksRemaining={3}
        totalTicks={5}
        narration="Channeling..."
      />,
    );
    expect(container.querySelector('.extraction-overlay')).toBeInTheDocument();
  });

  it('renders ExtractionSuccess for success phase', () => {
    const { container } = render(
      <ExtractionScreen
        phase="success"
        items={sampleLoot}
        summary={baseSummary}
        stash={sampleStash}
        onReturn={() => {}}
      />,
    );
    expect(container.querySelector('.extraction-screen--success')).toBeInTheDocument();
  });

  it('renders ExtractionFailure for failure phase', () => {
    const { container } = render(
      <ExtractionScreen
        phase="failure"
        itemsLost={[]}
        debuffs={['Shard-sickness']}
        summary={baseSummary}
        onReturn={() => {}}
      />,
    );
    expect(container.querySelector('.extraction-screen--failure')).toBeInTheDocument();
  });
});
