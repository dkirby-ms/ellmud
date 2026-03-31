import { useEffect, useState } from 'react';
import { fetchAuditLog, type AuditEvent } from '../../lib/admin-api';

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  const loadLogs = async (resetOffset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentOffset = resetOffset ? 0 : offset;
      
      const response = await fetchAuditLog({
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        actor: actorFilter || undefined,
        limit: LIMIT,
        offset: currentOffset,
      });
      
      if (resetOffset) {
        setLogs(response.events);
        setOffset(0);
      } else {
        setLogs((prev) => [...prev, ...response.events]);
      }
      
      setHasMore(response.events.length === LIMIT);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
      setError('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(true);
  }, [actionFilter, entityFilter, actorFilter]);

  const loadMore = () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    loadLogs(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.charAt(0).toUpperCase() + action.slice(1);
  };

  return (
    <div className="p-8">
      <h1
        className="text-[#C9A84C] text-2xl mb-6"
       
      >
        Audit Log
      </h1>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 mb-4 flex items-center gap-4">
        <select
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="">All Entities</option>
          <option value="items">Items</option>
          <option value="creatures">Creatures</option>
          <option value="modifiers">Modifiers</option>
          <option value="skills">Skills</option>
          <option value="loot-tables">Loot Tables</option>
          <option value="factions">Factions</option>
          <option value="rooms">Rooms</option>
          <option value="narrative">Narrative</option>
        </select>

        <select
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
        >
          <option value="">All Actors</option>
          <option value="admin">Admin</option>
          <option value="system">System</option>
        </select>

        <select
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="deploy">Deploy</option>
          <option value="review">Review</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4 text-red-300">
          {error}
        </div>
      )}

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1C1D27] border-b border-[#2A2B35]">
            <tr>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Timestamp
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Actor
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Entity Type
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Action
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Entity
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#8A8B95]">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#8A8B95]">
                  No audit events found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors"
                >
                  <td
                    className="p-4 text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {formatTimestamp(log.created_at)}
                  </td>
                  <td
                    className="p-4 text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {log.actor}
                  </td>
                  <td
                    className="p-4 text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {log.entity_type || '-'}
                  </td>
                  <td
                    className="p-4 text-[#3A7D7B] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {formatAction(log.action)}
                  </td>
                  <td
                    className="p-4 text-[#E8E0D0] text-sm"
                   
                  >
                    {log.entity_name || log.entity_id || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {hasMore && logs.length > 0 && (
          <div className="p-4 border-t border-[#2A2B35] text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="bg-[#1C1D27] hover:bg-[#2A2B35] border border-[#2A2B35] rounded px-4 py-2 text-[#E8E0D0] text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
