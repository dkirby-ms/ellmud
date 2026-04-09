/**
 * CompassControl.test.tsx — Tests for the persistent compass navigation widget.
 *
 * Verifies:
 * - Available exits render as enabled buttons
 * - Unavailable directions are dimmed/disabled
 * - Clicking a direction fires the onNavigate callback
 * - Up/Down buttons work correctly
 * - Empty exits state renders all directions disabled
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import {
  AppContext,
  appReducer,
  initialState,
  type AppState,
} from '../store.js';
import CompassControl from '../components/CompassControl.js';

/** Wrap CompassControl in the AppContext provider with custom state overrides. */
function renderCompass(
  overrides: Partial<AppState> = {},
  onNavigate = vi.fn(),
) {
  const merged = { ...initialState, ...overrides };

  function Wrapper() {
    const [state, dispatch] = useReducer(appReducer, merged);
    return (
      <AppContext.Provider value={{ state, dispatch }}>
        <CompassControl onNavigate={onNavigate} />
      </AppContext.Provider>
    );
  }

  return { ...render(<Wrapper />), onNavigate };
}

describe('CompassControl', () => {
  it('renders the compass container', () => {
    renderCompass();
    expect(screen.getByTestId('compass-control')).toBeDefined();
  });

  it('enables only available exit directions', () => {
    renderCompass({
      roomHeader: { roomName: 'Test Room', exits: ['north', 'east'], stability: 1 },
    });

    const northBtn = screen.getByText('N');
    const eastBtn = screen.getByText('E');
    const southBtn = screen.getByText('S');
    const westBtn = screen.getByText('W');

    expect(northBtn).not.toBeDisabled();
    expect(eastBtn).not.toBeDisabled();
    expect(southBtn).toBeDisabled();
    expect(westBtn).toBeDisabled();
  });

  it('fires onNavigate with the correct direction on click', async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderCompass({
      roomHeader: { roomName: 'Hall', exits: ['north', 'south'], stability: 1 },
    });

    await user.click(screen.getByText('N'));
    expect(onNavigate).toHaveBeenCalledWith('north');

    await user.click(screen.getByText('S'));
    expect(onNavigate).toHaveBeenCalledWith('south');
  });

  it('does not fire onNavigate for disabled directions', async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderCompass({
      roomHeader: { roomName: 'Sealed Room', exits: ['north'], stability: 1 },
    });

    await user.click(screen.getByText('S'));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('handles up/down exits', () => {
    renderCompass({
      roomHeader: { roomName: 'Shaft', exits: ['up', 'down'], stability: 1 },
    });

    const upBtn = screen.getByText('▲ Up');
    const downBtn = screen.getByText('▼ Down');

    expect(upBtn.closest('button')).not.toBeDisabled();
    expect(downBtn.closest('button')).not.toBeDisabled();
  });

  it('dims up/down when unavailable', () => {
    renderCompass({
      roomHeader: { roomName: 'Flat Room', exits: ['north'], stability: 1 },
    });

    const upBtn = screen.getByText('▲ Up');
    const downBtn = screen.getByText('▼ Down');

    expect(upBtn.closest('button')).toBeDisabled();
    expect(downBtn.closest('button')).toBeDisabled();
  });

  it('disables all directions when no room header exists', () => {
    renderCompass({ roomHeader: null });

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('applies golden highlight classes to available direction buttons', () => {
    renderCompass({
      roomHeader: { roomName: 'Hall', exits: ['north', 'south', 'up'], stability: 1 },
    });

    const northBtn = screen.getByText('N');
    const westBtn = screen.getByText('W');
    const upBtn = screen.getByText('▲ Up').closest('button')!;

    // Available buttons should have focus:text-accent-gold for selection highlight
    expect(northBtn.className).toContain('focus:text-accent-gold');
    expect(northBtn.className).toContain('focus:bg-bg-elevated');
    expect(upBtn.className).toContain('focus:text-accent-gold');
    expect(upBtn.className).toContain('focus:bg-bg-elevated');

    // Disabled buttons should NOT have focus highlight classes
    expect(westBtn.className).not.toContain('focus:text-accent-gold');
  });

  it('handles ordinal directions (northeast, etc.)', async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderCompass({
      roomHeader: { roomName: 'Junction', exits: ['northeast', 'southwest'], stability: 1 },
    });

    const neBtn = screen.getByTitle('Go northeast');
    await user.click(neBtn);
    expect(onNavigate).toHaveBeenCalledWith('northeast');

    const swBtn = screen.getByTitle('Go southwest');
    await user.click(swBtn);
    expect(onNavigate).toHaveBeenCalledWith('southwest');
  });
});
