export default function UsersList() {
  const users = [
    { name: "Jane Doe", email: "jane@ellmud.com", role: "Lead Designer" },
    { name: "Bob Smith", email: "bob@ellmud.com", role: "Designer" },
    { name: "Admin User", email: "admin@ellmud.com", role: "Admin" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Users
        </h1>
        <button
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          + Add User
        </button>
      </div>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1C1D27] border-b border-[#2A2B35]">
            <tr>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Name
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Email
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Role
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={i}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors"
              >
                <td
                  className="p-4 text-[#E8E0D0]"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {user.name}
                </td>
                <td
                  className="p-4 text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {user.email}
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 bg-[#3A7D7B] text-[#E8E0D0] text-xs rounded"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    className="text-[#8A8B95] hover:text-[#C9A84C] text-sm transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
