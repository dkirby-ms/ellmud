/**
 * auth.test.ts — Login/register flow with mocked API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthScreen } from '../components/AuthScreen.js';
import { AppContext, initialState, type AppContextValue } from '../store.js';
import * as api from '../services/api.js';

vi.mock('../services/api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));

const mockedLogin = vi.mocked(api.login);
const mockedRegister = vi.mocked(api.register);

function renderAuth(dispatch = vi.fn()) {
  const value: AppContextValue = {
    state: { ...initialState },
    dispatch,
  };

  return {
    dispatch,
    ...render(
      <AppContext.Provider value={value}>
        <AuthScreen />
      </AppContext.Provider>,
    ),
  };
}

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    renderAuth();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('toggles between login and register', async () => {
    const user = userEvent.setup();
    renderAuth();

    await user.click(screen.getByText(/new player\? register/i));
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();

    await user.click(screen.getByText(/already have an account\? login/i));
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls login API and dispatches LOGIN_SUCCESS on success', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({ token: 'abc-token', playerId: 'p1' });

    const { dispatch } = renderAuth();

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith('testuser', 'secret123');
      expect(dispatch).toHaveBeenCalledWith({
        type: 'LOGIN_SUCCESS',
        token: 'abc-token',
        playerId: 'p1',
      });
    });
  });

  it('calls register API when in register mode', async () => {
    const user = userEvent.setup();
    mockedRegister.mockResolvedValue({ token: 'reg-token', playerId: 'p2' });

    const { dispatch } = renderAuth();

    await user.click(screen.getByText(/new player\? register/i));
    await user.type(screen.getByLabelText(/username/i), 'newplayer');
    await user.type(screen.getByLabelText(/password/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockedRegister).toHaveBeenCalledWith('newplayer', 'pass1234');
      expect(dispatch).toHaveBeenCalledWith({
        type: 'LOGIN_SUCCESS',
        token: 'reg-token',
        playerId: 'p2',
      });
    });
  });

  it('displays API error message on login failure', async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue(new api.ApiError(401, 'Invalid credentials'));

    renderAuth();

    await user.type(screen.getByLabelText(/username/i), 'bad');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });
  });

  it('displays generic error on network failure', async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue(new Error('fetch failed'));

    renderAuth();

    await user.type(screen.getByLabelText(/username/i), 'test');
    await user.type(screen.getByLabelText(/password/i), 'test12');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Connection failed');
    });
  });

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup();
    // Don't resolve immediately — let it hang
    mockedLogin.mockReturnValue(new Promise(() => {}));

    renderAuth();

    await user.type(screen.getByLabelText(/username/i), 'test');
    await user.type(screen.getByLabelText(/password/i), 'test12');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
  });
});
