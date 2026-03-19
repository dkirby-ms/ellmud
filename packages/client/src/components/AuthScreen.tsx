import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { login, register, ApiError } from '../services/api.js';
import { useAppContext } from '../store.js';

const FLAVOR_LINES = [
  'The shard hums beneath your feet.',
  'Something ancient stirs in the deep.',
  'A faint light pulses beyond the veil.',
  'The Refuge gates groan against the wind.',
  'Iron meets bone in the dark below.',
  'Whispers curl from cracks in the stone.',
  'The collapse draws nearer with each breath.',
];

export function AuthScreen(): React.JSX.Element {
  const { dispatch } = useAppContext();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flavorIndex, setFlavorIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFlavorIndex((i) => (i + 1) % FLAVOR_LINES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const switchMode = useCallback((registerMode: boolean) => {
    setIsRegister(registerMode);
    setError(null);
    setConfirmPassword('');
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const authFn = isRegister ? register : login;
      const result = await authFn(username, password);
      dispatch({ type: 'LOGIN_SUCCESS', token: result.token, playerId: result.playerId });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Connection failed. Is the server running?');
      }
    } finally {
      setLoading(false);
    }
  }, [username, password, confirmPassword, isRegister, dispatch]);

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <h1 className="auth-title">ELLMUD</h1>
        <p className="auth-subtitle">The shards are calling.</p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`auth-tab${!isRegister ? ' active' : ''}`}
            aria-selected={!isRegister}
            onClick={() => switchMode(false)}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            className={`auth-tab${isRegister ? ' active' : ''}`}
            aria-selected={isRegister}
            onClick={() => switchMode(true)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 chars, alphanumeric"
              autoFocus
              disabled={loading}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6+ characters"
              disabled={loading}
              required
            />
          </div>

          {isRegister && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                disabled={loading}
                required
              />
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading
              ? 'Connecting...'
              : isRegister
                ? 'Create Shardwalker'
                : 'Enter the Refuge'}
          </button>
        </form>
      </div>

      <p className="auth-flavor">{FLAVOR_LINES[flavorIndex]}</p>
    </div>
  );
}
