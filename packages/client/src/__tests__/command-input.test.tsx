/**
 * command-input.test.ts — Alias expansion, command history, input behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandInput } from '../components/CommandInput.js';
import { expandAlias } from '../services/aliases.js';

// ─── Alias expansion unit tests ──────────────────────────────────────────────

describe('expandAlias', () => {
  it('expands single-letter direction aliases', () => {
    expect(expandAlias('n')).toBe('go north');
    expect(expandAlias('s')).toBe('go south');
    expect(expandAlias('e')).toBe('go east');
    expect(expandAlias('w')).toBe('go west');
    expect(expandAlias('u')).toBe('go up');
    expect(expandAlias('d')).toBe('go down');
  });

  it('expands utility aliases', () => {
    expect(expandAlias('l')).toBe('look');
    expect(expandAlias('i')).toBe('inventory');
    expect(expandAlias('inv')).toBe('inventory');
    expect(expandAlias('eq')).toBe('equipment');
    expect(expandAlias('h')).toBe('help');
    expect(expandAlias('?')).toBe('help');
  });

  it('passes through unknown commands unchanged', () => {
    expect(expandAlias('attack goblin')).toBe('attack goblin');
    expect(expandAlias('say hello world')).toBe('say hello world');
  });

  it('appends extra args to expanded alias', () => {
    expect(expandAlias('l carefully')).toBe('look carefully');
  });

  it('is case-insensitive for alias matching', () => {
    expect(expandAlias('N')).toBe('go north');
    expect(expandAlias('L')).toBe('look');
  });

  it('handles empty and whitespace input', () => {
    expect(expandAlias('')).toBe('');
    expect(expandAlias('   ')).toBe('');
  });

  it('accepts custom alias map', () => {
    const custom = { x: 'extract', f: 'flee' };
    expect(expandAlias('x', custom)).toBe('extract');
    expect(expandAlias('f', custom)).toBe('flee');
    expect(expandAlias('n', custom)).toBe('n'); // not in custom map
  });
});

// ─── CommandInput component tests ────────────────────────────────────────────

describe('CommandInput', () => {
  it('renders an input field', () => {
    render(<CommandInput onCommand={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /command input/i })).toBeInTheDocument();
  });

  it('calls onCommand with expanded alias on Enter', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();

    render(<CommandInput onCommand={onCommand} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'n{enter}');

    expect(onCommand).toHaveBeenCalledWith('go north');
  });

  it('calls onCommand with raw command when no alias matches', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();

    render(<CommandInput onCommand={onCommand} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'attack goblin{enter}');

    expect(onCommand).toHaveBeenCalledWith('attack goblin');
  });

  it('clears input after submission', async () => {
    const user = userEvent.setup();
    render(<CommandInput onCommand={vi.fn()} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'look{enter}');

    expect(input).toHaveValue('');
  });

  it('does not submit empty input', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();

    render(<CommandInput onCommand={onCommand} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '{enter}');

    expect(onCommand).not.toHaveBeenCalled();
  });

  it('navigates command history with arrow keys', async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();

    render(<CommandInput onCommand={onCommand} />);

    const input = screen.getByRole('textbox');

    // Send two commands
    await user.type(input, 'look{enter}');
    await user.type(input, 'go north{enter}');

    // Arrow up should show most recent
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('go north');

    // Arrow up again for previous
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('look');

    // Arrow down should go forward
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('go north');

    // Arrow down again should clear
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('');
  });

  it('shows disabled state', () => {
    render(<CommandInput onCommand={vi.fn()} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
