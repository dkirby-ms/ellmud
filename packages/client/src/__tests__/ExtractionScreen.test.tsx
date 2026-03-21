import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtractionScreen } from '../components/ExtractionScreen.js';

vi.mock('../services/connection.js');

const baseStats = { timeSeconds: 342, roomsExplored: 8, enemiesDefeated: 5 };

const extractingProps = {
  phase: 'extracting' as const,
  progress: 45,
};

const successProps = {
  phase: 'success' as const,
  loot: [
    { id: 'l1', name: 'Iron Sword', tier: 'common' as const },
    { id: 'l2', name: 'Crystal Shard', tier: 'relic' as const },
    { id: 'l3', name: 'Sturdy Shield', tier: 'sturdy' as const },
    { id: 'l4', name: 'Refined Helm', tier: 'refined' as const },
    { id: 'l5', name: 'Masterwork Bow', tier: 'masterwork' as const },
  ],
  xpGained: 1250,
  stats: baseStats,
};

const failureProps = {
  phase: 'failure' as const,
  reason: 'You were overwhelmed by the shard guardians.',
  stats: baseStats,
};

describe('ExtractionScreen – Extracting Phase', () => {
  it('renders a progress bar with progressbar role', () => {
    render(<ExtractionScreen {...extractingProps} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays the progress percentage', () => {
    render(<ExtractionScreen {...extractingProps} />);
    expect(screen.getByText(/45%?/)).toBeInTheDocument();
  });

  it('displays "Extracting..." text', () => {
    render(<ExtractionScreen {...extractingProps} />);
    expect(screen.getByText(/extracting/i)).toBeInTheDocument();
  });

  it('applies extraction-progress CSS class', () => {
    const { container } = render(<ExtractionScreen {...extractingProps} />);
    expect(container.querySelector('.extraction-progress')).toBeInTheDocument();
  });

  it('renders a cancel button', () => {
    render(<ExtractionScreen {...extractingProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('sets progress bar aria-valuenow to current progress', () => {
    render(<ExtractionScreen phase="extracting" progress={72} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '72');
  });

  it('sets progress bar aria-valuemax to 100', () => {
    render(<ExtractionScreen {...extractingProps} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100');
  });
});

describe('ExtractionScreen – Success Phase', () => {
  it('displays "Extraction Complete" heading', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.getByRole('heading', { name: /extraction complete/i })).toBeInTheDocument();
  });

  it('renders loot summary list', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Crystal Shard')).toBeInTheDocument();
  });

  it('applies loot-tier--common class', () => {
    const { container } = render(<ExtractionScreen {...successProps} />);
    expect(container.querySelector('.loot-tier--common')).toBeInTheDocument();
  });

  it('applies loot-tier--sturdy class', () => {
    const { container } = render(<ExtractionScreen {...successProps} />);
    expect(container.querySelector('.loot-tier--sturdy')).toBeInTheDocument();
  });

  it('applies loot-tier--refined class', () => {
    const { container } = render(<ExtractionScreen {...successProps} />);
    expect(container.querySelector('.loot-tier--refined')).toBeInTheDocument();
  });

  it('applies loot-tier--masterwork class', () => {
    const { container } = render(<ExtractionScreen {...successProps} />);
    expect(container.querySelector('.loot-tier--masterwork')).toBeInTheDocument();
  });

  it('applies loot-tier--relic class', () => {
    const { container } = render(<ExtractionScreen {...successProps} />);
    expect(container.querySelector('.loot-tier--relic')).toBeInTheDocument();
  });

  it('displays XP gained', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.getByText(/1,?250/)).toBeInTheDocument();
  });

  it('renders "Return to Refuge" button', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.getByRole('button', { name: /return to refuge/i })).toBeInTheDocument();
  });

  it('calls onReturn when "Return to Refuge" is clicked', async () => {
    const user = userEvent.setup();
    const onReturn = vi.fn();
    render(<ExtractionScreen {...successProps} onReturn={onReturn} />);

    await user.click(screen.getByRole('button', { name: /return to refuge/i }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('displays all loot items in the list', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Crystal Shard')).toBeInTheDocument();
    expect(screen.getByText('Sturdy Shield')).toBeInTheDocument();
    expect(screen.getByText('Refined Helm')).toBeInTheDocument();
    expect(screen.getByText('Masterwork Bow')).toBeInTheDocument();
  });
});

describe('ExtractionScreen – Failure Phase', () => {
  it('displays "Extraction Failed" heading', () => {
    render(<ExtractionScreen {...failureProps} />);
    expect(screen.getByRole('heading', { name: /extraction failed/i })).toBeInTheDocument();
  });

  it('displays the failure reason text', () => {
    render(<ExtractionScreen {...failureProps} />);
    expect(screen.getByText(/overwhelmed by the shard guardians/i)).toBeInTheDocument();
  });

  it('applies extraction-failed CSS class', () => {
    const { container } = render(<ExtractionScreen {...failureProps} />);
    expect(container.querySelector('.extraction-failed')).toBeInTheDocument();
  });

  it('renders "Return to Refuge" button', () => {
    render(<ExtractionScreen {...failureProps} />);
    expect(screen.getByRole('button', { name: /return to refuge/i })).toBeInTheDocument();
  });

  it('does not display loot items', () => {
    render(<ExtractionScreen {...failureProps} />);
    expect(screen.queryByText('Iron Sword')).not.toBeInTheDocument();
  });

  it('does not display XP gained', () => {
    render(<ExtractionScreen {...failureProps} />);
    expect(screen.queryByText(/xp gained/i)).not.toBeInTheDocument();
  });
});

describe('ExtractionScreen – General', () => {
  it('has an aria-live region', () => {
    const { container } = render(<ExtractionScreen {...successProps} />);
    expect(container.querySelector('[aria-live]')).toBeInTheDocument();
  });

  it('displays time stat in run stats', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.getByText(/342|5:42/)).toBeInTheDocument();
  });

  it('displays rooms explored stat', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.getByText(/8/)).toBeInTheDocument();
  });

  it('displays enemies defeated stat', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('displays run stats in failure phase too', () => {
    render(<ExtractionScreen {...failureProps} />);
    expect(screen.getByText(/342|5:42/)).toBeInTheDocument();
  });

  it('renders with extraction-screen CSS class', () => {
    const { container } = render(<ExtractionScreen {...successProps} />);
    expect(container.querySelector('.extraction-screen')).toBeInTheDocument();
  });

  it('does not show cancel button in success phase', () => {
    render(<ExtractionScreen {...successProps} />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });
});
