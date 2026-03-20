import { useReducer } from 'react';
import { AppContext, appReducer, initialState } from './store.js';
import { AuthScreen } from './components/AuthScreen.js';
import { GameScreen } from './components/GameScreen.js';
import { useDevAutoLogin } from './hooks/useDevAutoLogin.js';
import './styles.css';

export function App(): React.JSX.Element {
  const [state, dispatch] = useReducer(appReducer, initialState);
  useDevAutoLogin();

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {state.authenticated ? <GameScreen /> : <AuthScreen />}
    </AppContext.Provider>
  );
}
