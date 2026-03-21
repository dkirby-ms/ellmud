export default function AuditLog() {
  const logs = [
    {
      timestamp: "2025-07-25 14:30",
      author: "Jane",
      domain: "Creatures",
      action: "Published",
      entity: "Cinder Wraith",
    },
    {
      timestamp: "2025-07-25 14:28",
      author: "Bob",
      domain: "Balance",
      action: "Edited",
      entity: "Combat group",
    },
    {
      timestamp: "2025-07-25 13:00",
      author: "Jane",
      domain: "Items",
      action: "Created",
      entity: "Ember Shard",
    },
    {
      timestamp: "2025-07-25 12:45",
      author: "Admin",
      domain: "Deploy",
      action: "Deployed",
      entity: "v47 → Prod",
    },
  ];

  return (
    <div className="p-8">
      <h1
        className="text-[#C9A84C] text-2xl mb-6"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Audit Log
      </h1>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 mb-4 flex items-center gap-4">
        <select
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option>All Domains</option>
          <option>Creatures</option>
          <option>Items</option>
          <option>Biomes</option>
        </select>

        <select
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option>All Authors</option>
          <option>Jane</option>
          <option>Bob</option>
        </select>

        <select
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option>All Actions</option>
          <option>Created</option>
          <option>Edited</option>
          <option>Published</option>
          <option>Deployed</option>
        </select>
      </div>

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
                Author
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Domain
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
            {logs.map((log, i) => (
              <tr
                key={i}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors"
              >
                <td
                  className="p-4 text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {log.timestamp}
                </td>
                <td
                  className="p-4 text-[#E8E0D0] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {log.author}
                </td>
                <td
                  className="p-4 text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {log.domain}
                </td>
                <td
                  className="p-4 text-[#3A7D7B] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {log.action}
                </td>
                <td
                  className="p-4 text-[#E8E0D0] text-sm"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {log.entity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
