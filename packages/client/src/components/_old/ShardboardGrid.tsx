import type { ShardCardData } from '@ellmud/shared';
import { ShardCard } from './ShardCard.js';

export interface ShardboardGridProps {
  shards: ShardCardData[];
  onEnterShard: (shardId: string) => void;
}

export function ShardboardGrid({ shards, onEnterShard }: ShardboardGridProps): React.JSX.Element {
  if (shards.length === 0) {
    return (
      <section className="shardboard" aria-label="Shardboard">
        <p className="shardboard__empty">No shards available. Check back soon.</p>
      </section>
    );
  }

  return (
    <section className="shardboard" aria-label="Shardboard">
      <div className="shardboard__grid">
        {shards.map((shard) => (
          <ShardCard key={shard.shardId} shard={shard} onEnter={onEnterShard} />
        ))}
      </div>
    </section>
  );
}
