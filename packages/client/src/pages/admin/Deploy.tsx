import { useState, useEffect } from 'react';
import {
  fetchDeployDiff,
  deployToStaging,
  deployToProduction,
  fetchDeployHistory,
  rollbackDeployment,
  type DeployDiffResponse,
  type DeployHistoryRecord,
  AdminAPIError,
} from '../../lib/admin-api';

export default function Deploy() {
  const [diff, setDiff] = useState<DeployDiffResponse | null>(null);
  const [history, setHistory] = useState<DeployHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<'staging' | 'production' | null>(null);
  const [showProductionConfirm, setShowProductionConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showDiff, setShowDiff] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [diffData, historyData] = await Promise.all([
        fetchDeployDiff(),
        fetchDeployHistory(20, 0),
      ]);
      setDiff(diffData);
      setHistory(historyData.deployments);
    } catch (err) {
      setError(err instanceof AdminAPIError ? err.message : 'Failed to load data');
      console.error('[Deploy] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeployStaging = async () => {
    try {
      setDeploying('staging');
      setError(null);
      await deployToStaging('admin');
      await loadData();
    } catch (err) {
      setError(err instanceof AdminAPIError ? err.message : 'Failed to deploy to staging');
      console.error('[Deploy] Staging deploy error:', err);
    } finally {
      setDeploying(null);
    }
  };

  const handleDeployProduction = async () => {
    if (confirmText !== 'DEPLOY') {
      setError('Please type DEPLOY to confirm');
      return;
    }

    try {
      setDeploying('production');
      setError(null);
      await deployToProduction('admin');
      setShowProductionConfirm(false);
      setConfirmText('');
      await loadData();
    } catch (err) {
      setError(err instanceof AdminAPIError ? err.message : 'Failed to deploy to production');
      console.error('[Deploy] Production deploy error:', err);
    } finally {
      setDeploying(null);
    }
  };

  const handleRollback = async (id: string) => {
    if (!confirm('Are you sure you want to rollback this deployment?')) return;

    try {
      await rollbackDeployment(id);
      await loadData();
    } catch (err) {
      setError(err instanceof AdminAPIError ? err.message : 'Failed to rollback deployment');
      console.error('[Deploy] Rollback error:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-[#C9A84C] text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>
          Deploy Content
        </h1>
        <p className="text-[#8A8B95]">Loading...</p>
      </div>
    );
  }

  const changesByType: Record<string, number> = {};
  diff?.pendingChanges.forEach((change) => {
    changesByType[change.entityType] = (changesByType[change.entityType] || 0) + 1;
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-[#3A7D7B] text-[#E8E0D0]',
      failed: 'bg-[#8B4513] text-[#E8E0D0]',
      rolled_back: 'bg-[#5A5A6A] text-[#8A8B95]',
      pending: 'bg-[#C9A84C] text-[#0A0B0F]',
      in_progress: 'bg-[#C9A84C] text-[#0A0B0F]',
    };
    return colors[status] || 'bg-[#2A2B35] text-[#8A8B95]';
  };

  return (
    <div className="p-8">
      <h1 className="text-[#C9A84C] text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>
        Deploy Content
      </h1>

      {error && (
        <div className="bg-[#8B4513] border border-[#A0522D] rounded-lg p-4 mb-6">
          <p className="text-[#E8E0D0]" style={{ fontFamily: 'var(--font-sans)' }}>
            ⚠ {error}
          </p>
        </div>
      )}

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 mb-6">
        <div className="mb-4">
          <p className="text-[#E8E0D0] mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
            {diff?.lastDeploy ? (
              <>
                Last Deployment:{' '}
                <span className="text-[#C9A84C]">{diff.lastDeploy.environment}</span> (
                {new Date(diff.lastDeploy.completedAt).toLocaleString()}) by{' '}
                {diff.lastDeploy.deployedBy}
                <br />
                Entities: <span className="text-[#C9A84C]">{diff.lastDeploy.entityCount}</span>
              </>
            ) : (
              <span className="text-[#8A8B95]">No previous deployments</span>
            )}
          </p>
        </div>

        <div className="bg-[#1C1D27] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#8A8B95] text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              Pending Changes:
            </h3>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="text-[#C9A84C] hover:text-[#E8E0D0] text-sm transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {showDiff ? 'Hide' : 'Show'} Details
            </button>
          </div>

          {diff?.pendingChanges.length === 0 ? (
            <p className="text-[#8A8B95] text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              No changes since last deployment
            </p>
          ) : (
            <>
              <div className="space-y-2 text-sm mb-3">
                {Object.entries(changesByType).map(([type, count]) => (
                  <p key={type} className="text-[#E8E0D0]" style={{ fontFamily: 'var(--font-sans)' }}>
                    ✅ {type}: <span className="text-[#C9A84C]">{count}</span> change
                    {count !== 1 ? 's' : ''}
                  </p>
                ))}
              </div>
              <p className="text-[#8A8B95] text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
                {diff?.pendingChanges.length} total change{diff?.pendingChanges.length !== 1 ? 's' : ''}
              </p>
            </>
          )}

          {showDiff && diff && diff.pendingChanges.length > 0 && (
            <div className="mt-4 border-t border-[#2A2B35] pt-4">
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {diff.pendingChanges.map((change, idx) => (
                  <div key={idx} className="text-xs text-[#E8E0D0]" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span className="text-[#C9A84C]">{change.action === 'created' ? '+' : '~'}</span>{' '}
                    {change.entityType}/{change.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="px-4 py-2 border border-[#8A8B95] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {showDiff ? 'Hide' : 'Preview'} Deployment Diff
          </button>
          <button
            onClick={handleDeployStaging}
            disabled={deploying !== null}
            className="px-4 py-2 bg-[#3A7D7B] hover:bg-[#2D6B5F] text-[#E8E0D0] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {deploying === 'staging' ? 'Deploying...' : 'Deploy to Staging'}
          </button>
          <button
            onClick={() => setShowProductionConfirm(true)}
            disabled={deploying !== null}
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Deploy to Production
          </button>
        </div>
      </div>

      {showProductionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#12131A] border border-[#C9A84C] rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-[#C9A84C] text-xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              Confirm Production Deployment
            </h2>
            <p className="text-[#E8E0D0] mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              You are about to deploy {diff?.pendingChanges.length || 0} changes to production.
            </p>
            <p className="text-[#8A8B95] text-sm mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              Type <span className="text-[#C9A84C] font-bold">DEPLOY</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] mb-4"
              style={{ fontFamily: 'var(--font-sans)' }}
              placeholder="DEPLOY"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowProductionConfirm(false);
                  setConfirmText('');
                  setError(null);
                }}
                disabled={deploying !== null}
                className="flex-1 px-4 py-2 border border-[#8A8B95] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeployProduction}
                disabled={deploying !== null || confirmText !== 'DEPLOY'}
                className="flex-1 px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {deploying === 'production' ? 'Deploying...' : 'Deploy'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
        <h2 className="text-[#C9A84C] text-lg mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
          Deployment History
        </h2>
        {history.length === 0 ? (
          <p className="text-[#8A8B95]" style={{ fontFamily: 'var(--font-sans)' }}>
            No deployment history
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((deployment) => (
              <div key={deployment.id} className="p-3 bg-[#1C1D27] rounded flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadge(deployment.status)}`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {deployment.environment}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${statusBadge(deployment.status)}`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {deployment.status}
                    </span>
                  </div>
                  <p className="text-[#E8E0D0] text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                    {deployment.deployed_by} —{' '}
                    {deployment.completed_at
                      ? new Date(deployment.completed_at).toLocaleString()
                      : 'In progress'}
                    {' — '}
                    {deployment.entity_count} entities
                  </p>
                  <p className="text-[#8A8B95] text-xs mt-1" style={{ fontFamily: 'var(--font-sans)' }}>
                    {Object.entries(deployment.changes_summary)
                      .map(([type, count]) => `${type}: ${count}`)
                      .join(', ')}
                  </p>
                </div>
                {deployment.status === 'completed' && (
                  <button
                    onClick={() => handleRollback(deployment.id)}
                    className="ml-4 px-3 py-1 text-xs border border-[#8A8B95] hover:bg-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    Rollback
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
