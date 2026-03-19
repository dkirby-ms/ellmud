import { useState, useCallback, type FormEvent } from 'react';
import { login, register, ApiError } from '../services/api.js';
import { useAppContext } from '../store.js';

export function AuthScreen(): React.JSX.Element {
  const { dispatch } = useAppContext();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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
  }, [username, password, isRegister, dispatch]);

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <h1 className="auth-title">⌁ Ellmud</h1>
        <p className="auth-subtitle">
          {isRegister ? 'Create your character' : 'Enter the Refuge'}
        </p>

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

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Connecting...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => { setIsRegister(!isRegister); setError(null); }}
          disabled={loading}
        >
          {isRegister ? 'Already have an account? Login' : 'New player? Register'}
        </button>
      </div>
    </div>
  );
}
