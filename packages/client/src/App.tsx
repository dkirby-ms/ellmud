import { useReducer } from 'react';
import { AppContext, appReducer, initialState, useAppContext } from './store.js';
import { AuthScreen } from './components/AuthScreen.js';
import { GameScreen } from './components/GameScreen.js';
import { ToastContainer } from './components/ToastContainer.js';
import { useDevAutoLogin } from './hooks/useDevAutoLogin.js';
import './styles.css';

function AppRoutes(): React.JSX.Element {
  const { state } = useAppContext();
  useDevAutoLogin();
  return state.authenticated ? <GameScreen /> : <AuthScreen />;
}

export function App(): React.JSX.Element {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppRoutes />
      <ToastContainer />
    </AppContext.Provider>
  );
}
