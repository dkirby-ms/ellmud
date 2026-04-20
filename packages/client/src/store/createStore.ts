/**
 * createStore — Generic factory for domain-specific Zustand stores.
 *
 * Every store gets:
 *   - subscribeWithSelector middleware (for fine-grained subscriptions)
 *   - devtools middleware (named `ellmud-<name>`)
 *   - A `dispatch` method that feeds actions through a reducer
 *
 * The `{ dispatch: _, ...state }` pattern strips the dispatch function
 * before passing state to the reducer, so reducers see pure state only.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

export function createStore<S extends object, A extends { type: string }>(
  name: string,
  initialState: S,
  reducer: (state: S, action: A) => S,
) {
  return create<S & { dispatch: (action: A) => void }>()(
    subscribeWithSelector(
      devtools(
        (set) => ({
          ...initialState,
          dispatch: (action: A) =>
            set(
              (prev) => {
                const { dispatch: _, ...state } = prev;
                return reducer(state as unknown as S, action);
              },
              undefined,
              action.type,
            ),
        }),
        { name: `ellmud-${name}` },
      ),
    ),
  );
}
