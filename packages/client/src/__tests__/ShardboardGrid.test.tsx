import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShardboardGrid } from '../components/ShardboardGrid.js';
import type { ShardCardData } from '@ellmud/shared';

function makeShard(overrides: Partial<ShardCardData> & { shardId: string }): ShardCardData {
  return {
    name: 'Test Shard',
    tier: 1,
    biome: 'flooded_crypt',
    modifiers: [],
    currentPlayers: 0,
    maxPlayers: 4,
    entryWindowSeconds: 600,
    keyCost: 'bone',
    ...overrides,
  };
}

describe('ShardboardGrid', () => {
  it('renders empty state when no shards', () => {
    render(<ShardboardGrid shards={[]} onEnterShard={vi.fn()} />);
    expect(screen.getByText('No shards available. Check back soon.')).toBeInTheDocument();
  });

  it('renders grid section with aria-label', () => {
    render(<ShardboardGrid shards={[]} onEnterShard={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Shardboard' })).toBeInTheDocument();
  });

  it('renders one card per shard', () => {
    const shards = [
      makeShard({ shardId: 's1', name: 'Shard Alpha' }),
      makeShard({ shardId: 's2', name: 'Shard Beta' }),
      makeShard({ shardId: 's3', name: 'Shard Gamma' }),
    ];
    render(<ShardboardGrid shards={shards} onEnterShard={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('passes onEnterShard to each card', async () => {
    const onEnter = vi.fn();
    const shards = [makeShard({ shardId: 'shard-x', name: 'X' })];
    render(<ShardboardGrid shards={shards} onEnterShard={onEnter} />);

    const btn = screen.getByRole('button', { name: /enter shard/i });
    btn.click();
    expect(onEnter).toHaveBeenCalledWith('shard-x');
  });

  it('renders shards with different tiers', () => {
    const shards = [
      makeShard({ shardId: 't1', tier: 1 }),
      makeShard({ shardId: 't2', tier: 2 }),
      makeShard({ shardId: 't3', tier: 3 }),
    ];
    render(<ShardboardGrid shards={shards} onEnterShard={vi.fn()} />);
    expect(screen.getByText('Tier 1')).toBeInTheDocument();
    expect(screen.getByText('Tier 2')).toBeInTheDocument();
    expect(screen.getByText('Tier 3')).toBeInTheDocument();
  });

  it('renders shards with different biomes', () => {
    const shards = [
      makeShard({ shardId: 'b1', biome: 'flooded_crypt' }),
      makeShard({ shardId: 'b2', biome: 'shattered_bastion' }),
      makeShard({ shardId: 'b3', biome: 'fungal_deep' }),
      makeShard({ shardId: 'b4', biome: 'ashen_reach' }),
      makeShard({ shardId: 'b5', biome: 'void_rift' }),
    ];
    render(<ShardboardGrid shards={shards} onEnterShard={vi.fn()} />);
    expect(screen.getByText('Flooded Crypt')).toBeInTheDocument();
    expect(screen.getByText('Shattered Bastion')).toBeInTheDocument();
    expect(screen.getByText('Fungal Deep')).toBeInTheDocument();
    expect(screen.getByText('Ember Rift')).toBeInTheDocument();
    expect(screen.getByText('Hollow Archive')).toBeInTheDocument();
  });

  it('does not render grid container when empty', () => {
    const { container } = render(<ShardboardGrid shards={[]} onEnterShard={vi.fn()} />);
    expect(container.querySelector('.shardboard__grid')).not.toBeInTheDocument();
  });

  it('renders grid container when shards exist', () => {
    const { container } = render(
      <ShardboardGrid
        shards={[makeShard({ shardId: 'g1' })]}
        onEnterShard={vi.fn()}
      />,
    );
    expect(container.querySelector('.shardboard__grid')).toBeInTheDocument();
  });
});
