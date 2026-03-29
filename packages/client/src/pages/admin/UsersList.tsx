import { useState, useEffect, useCallback } from 'react';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  type AdminUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  AdminAPIError,
} from '../../lib/admin-api';

const ROLES = ['player', 'viewer', 'moderator', 'admin'] as const;

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-[#8B2252]',
  moderator: 'bg-[#3A7D7B]',
  viewer: 'bg-[#4A4B55]',
  player: 'bg-[#2A5D3A]',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── User Form Modal ─────────────────────────────────────────────────────────

interface UserFormProps {
  user?: AdminUser;
  onSave: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function UserFormModal({ user, onSave, onCancel, saving, error }: UserFormProps) {
  const isEdit = !!user;
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role ?? 'player');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  function validate(): string[] {
    const errs: string[] = [];
    if (!isEdit && username.trim().length < 3) errs.push('Username must be at least 3 characters');
    if (isEdit && username.trim().length > 0 && username.trim().length < 3) errs.push('Username must be at least 3 characters');
    if (!isEdit && password.length < 8) errs.push('Password must be at least 8 characters');
    if (email && !isValidEmail(email)) errs.push('Invalid email format');
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors([]);

    if (isEdit) {
      const data: UpdateUserPayload = {};
      if (username !== user!.username) data.username = username.trim();
      if (email !== (user!.email ?? '')) data.email = email;
      if (role !== user!.role) data.role = role;
      onSave(data);
    } else {
      const data: CreateUserPayload = {
        username: username.trim(),
        password,
        role,
      };
      if (email) data.email = email;
      onSave(data);
    }
  }

  const allErrors = [...validationErrors, ...(error ? [error] : [])];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-[#C9A84C] text-xl mb-4"
         
        >
          {isEdit ? 'Edit User' : 'Add User'}
        </h2>

        {allErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
            {allErrors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-[#8A8B95] text-xs uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
              style={{ fontFamily: 'var(--font-sans)' }}
              required={!isEdit}
            />
          </div>

          <div>
            <label
              className="block text-[#8A8B95] text-xs uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
              style={{ fontFamily: 'var(--font-sans)' }}
              placeholder="optional"
            />
          </div>

          {!isEdit && (
            <div>
              <label
                className="block text-[#8A8B95] text-xs uppercase tracking-wider mb-1"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                style={{ fontFamily: 'var(--font-sans)' }}
                placeholder="min 8 characters"
                required
              />
            </div>
          )}

          <div>
            <label
              className="block text-[#8A8B95] text-xs uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-[#8A8B95] hover:text-[#E8E0D0] transition-colors"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors disabled:opacity-50"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

interface DeleteConfirmProps {
  user: AdminUser;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirmModal({ user, onConfirm, onCancel, deleting }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-[#C9A84C] text-xl mb-2"
         
        >
          Delete User
        </h2>
        <p className="text-[#8A8B95] text-sm mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
          Are you sure you want to delete <span className="text-[#E8E0D0] font-medium">{user.username}</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[#8A8B95] hover:text-[#E8E0D0] transition-colors"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main UsersList Component ────────────────────────────────────────────────

export default function UsersList() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof AdminAPIError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreate() {
    setEditingUser(undefined);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingUser(undefined);
    setFormError(null);
  }

  async function handleSave(data: CreateUserPayload | UpdateUserPayload) {
    setSaving(true);
    setFormError(null);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, data as UpdateUserPayload);
      } else {
        await createUser(data as CreateUserPayload);
      }
      closeForm();
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof AdminAPIError ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await deleteUser(deletingUser.id);
      setDeletingUser(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof AdminAPIError ? err.message : 'Failed to delete user');
      setDeletingUser(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
         
        >
          Users
        </h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors"
          style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}
        >
          + Add User
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-[#8A8B95] text-center py-12" style={{ fontFamily: 'var(--font-sans)' }}>
          Loading users…
        </div>
      ) : users.length === 0 ? (
        <div className="text-[#8A8B95] text-center py-12" style={{ fontFamily: 'var(--font-sans)' }}>
          No users found. Click "+ Add User" to create one.
        </div>
      ) : (
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1C1D27] border-b border-[#2A2B35]">
              <tr>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Username
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Email
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Role
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Created
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors"
                >
                  <td
                    className="p-4 text-[#E8E0D0]"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {user.username}
                  </td>
                  <td
                    className="p-4 text-[#8A8B95] text-sm"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {user.email ?? '—'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 ${ROLE_COLORS[user.role] ?? 'bg-[#4A4B55]'} text-[#E8E0D0] text-xs rounded`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td
                    className="p-4 text-[#8A8B95] text-sm"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 flex gap-3">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-[#8A8B95] hover:text-[#C9A84C] text-sm transition-colors"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingUser(user)}
                      className="text-[#8A8B95] hover:text-red-400 text-sm transition-colors"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <UserFormModal
          user={editingUser}
          onSave={handleSave}
          onCancel={closeForm}
          saving={saving}
          error={formError}
        />
      )}

      {deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onConfirm={handleDelete}
          onCancel={() => setDeletingUser(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
