/**
 * exit-link.test.tsx — ExitLink component rendering and interaction.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExitLink } from '../components/_old/ExitLink.js';

// TODO: ExitLink.tsx moved to _old/ during UX overhaul. Exit navigation now handled within new page components.
// Rewrite tests when exit links are reimplemented.
describe.skip('ExitLink', () => {
  it('renders the display text', () => {
    render(
      <ExitLink direction="north" displayText="North" onExitClick={() => {}} />,
    );
    expect(screen.getByText('North')).toBeInTheDocument();
  });

  it('calls onExitClick with direction on click', () => {
    const handler = vi.fn();
    render(
      <ExitLink direction="east" displayText="east" onExitClick={handler} />,
    );
    fireEvent.click(screen.getByText('east'));
    expect(handler).toHaveBeenCalledWith('east');
  });

  it('calls onExitClick on Enter key', () => {
    const handler = vi.fn();
    render(
      <ExitLink direction="south" displayText="south" onExitClick={handler} />,
    );
    fireEvent.keyDown(screen.getByText('south'), { key: 'Enter' });
    expect(handler).toHaveBeenCalledWith('south');
  });

  it('calls onExitClick on Space key', () => {
    const handler = vi.fn();
    render(
      <ExitLink direction="west" displayText="west" onExitClick={handler} />,
    );
    fireEvent.keyDown(screen.getByText('west'), { key: ' ' });
    expect(handler).toHaveBeenCalledWith('west');
  });

  it('is keyboard-focusable (tabIndex=0)', () => {
    const { container } = render(
      <ExitLink direction="up" displayText="up" onExitClick={() => {}} />,
    );
    const el = container.querySelector('.exit-link');
    expect(el).toHaveAttribute('tabindex', '0');
  });

  it('has accessible role and label', () => {
    render(
      <ExitLink direction="down" displayText="Down" onExitClick={() => {}} />,
    );
    const el = screen.getByRole('link', { name: 'Go down' });
    expect(el).toBeInTheDocument();
  });

  it('applies the exit-link CSS class', () => {
    const { container } = render(
      <ExitLink direction="north" displayText="north" onExitClick={() => {}} />,
    );
    expect(container.querySelector('.exit-link')).toBeInTheDocument();
  });
});
