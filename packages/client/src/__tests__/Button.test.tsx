/**
 * Button.test.tsx — Acceptance criteria tests for the Button component (Issue #74).
 *
 * Validates: 4 type variants, 3 size variants, disabled state,
 * keyboard interaction, icon + label layout, CSS variable compliance.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../components/_old/Button.js';

// ─── Type variants ───────────────────────────────────────────────────────────

// TODO: Button.tsx moved to _old/ during UX overhaul. Replaced by shadcn components/ui/button.tsx.
// Rewrite tests for shadcn Button variant API.
describe.skip('Button — type variants', () => {
  it('renders a primary button with correct variant class', () => {
    render(<Button type="primary">Primary</Button>);
    const btn = screen.getByRole('button', { name: 'Primary' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('btn--primary');
  });

  it('renders a secondary button with correct variant class', () => {
    render(<Button type="secondary">Secondary</Button>);
    const btn = screen.getByRole('button', { name: 'Secondary' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('btn--secondary');
  });

  it('renders a danger button with correct variant class', () => {
    render(<Button type="danger">Danger</Button>);
    const btn = screen.getByRole('button', { name: 'Danger' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('btn--danger');
  });

  it('renders a ghost button with correct variant class', () => {
    render(<Button type="ghost">Ghost</Button>);
    const btn = screen.getByRole('button', { name: 'Ghost' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('btn--ghost');
  });

  it('defaults to primary when no type specified', () => {
    render(<Button>Default</Button>);
    const btn = screen.getByRole('button', { name: 'Default' });
    expect(btn.className).toContain('btn--primary');
  });

  it('all four variants produce distinct class names', () => {
    const { container } = render(
      <>
        <Button type="primary">P</Button>
        <Button type="secondary">S</Button>
        <Button type="danger">D</Button>
        <Button type="ghost">G</Button>
      </>,
    );

    const classes = [...container.querySelectorAll('button')]
      .map((b) => b.className);
    const uniqueClasses = new Set(classes);
    expect(uniqueClasses.size).toBe(4);
  });
});

// ─── Size variants ───────────────────────────────────────────────────────────

describe.skip('Button — size variants', () => {
  it('renders small size with correct class', () => {
    render(<Button size="small">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn.className).toContain('btn--small');
  });

  it('renders medium size with correct class', () => {
    render(<Button size="medium">Medium</Button>);
    const btn = screen.getByRole('button', { name: 'Medium' });
    expect(btn.className).toContain('btn--medium');
  });

  it('renders large size with correct class', () => {
    render(<Button size="large">Large</Button>);
    const btn = screen.getByRole('button', { name: 'Large' });
    expect(btn.className).toContain('btn--large');
  });

  it('defaults to medium when no size specified', () => {
    render(<Button>Default Size</Button>);
    const btn = screen.getByRole('button', { name: 'Default Size' });
    expect(btn.className).toContain('btn--medium');
  });

  it('all three sizes produce distinct class names', () => {
    const { container } = render(
      <>
        <Button size="small">S</Button>
        <Button size="medium">M</Button>
        <Button size="large">L</Button>
      </>,
    );

    const classes = [...container.querySelectorAll('button')]
      .map((b) => b.className);
    const uniqueClasses = new Set(classes);
    expect(uniqueClasses.size).toBe(3);
  });
});

// ─── Disabled state ──────────────────────────────────────────────────────────

describe.skip('Button — disabled state', () => {
  it('is not disabled by default', () => {
    render(<Button>Enabled</Button>);
    expect(screen.getByRole('button', { name: 'Enabled' })).not.toBeDisabled();
  });

  it('renders disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });

  it('applies btn--disabled class when disabled', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const btn = container.querySelector('button')!;
    expect(btn).toBeDisabled();
    expect(btn.className).toContain('btn--disabled');
  });

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button disabled onClick={onClick}>No Click</Button>);
    await user.click(screen.getByRole('button', { name: 'No Click' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not apply btn--disabled class when not disabled', () => {
    const { container } = render(<Button>Active</Button>);
    expect(container.querySelector('button')!.className).not.toContain('btn--disabled');
  });
});

// ─── Interaction states ──────────────────────────────────────────────────────

describe.skip('Button — interaction', () => {
  it('fires onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Click Me</Button>);
    await user.click(screen.getByRole('button', { name: 'Click Me' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('can be focused via keyboard (Tab)', async () => {
    const user = userEvent.setup();
    render(<Button>Focusable</Button>);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Focusable' })).toHaveFocus();
  });

  it('can be activated via keyboard (Enter)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Enter Key</Button>);
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('can be activated via keyboard (Space)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Space Key</Button>);
    await user.tab();
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('element is focusable (tabIndex is not -1)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Button>Focus Ring</Button>);
    const btn = container.querySelector('button')!;

    await user.tab();
    expect(btn).toHaveFocus();
    expect(btn.tabIndex).not.toBe(-1);
  });
});

// ─── Icon + label layout ─────────────────────────────────────────────────────

describe.skip('Button — icon + label', () => {
  it('renders label text inside btn__label span', () => {
    const { container } = render(<Button>My Label</Button>);
    const label = container.querySelector('.btn__label');
    expect(label).toBeInTheDocument();
    expect(label!.textContent).toBe('My Label');
  });

  it('renders icon inside btn__icon span when icon prop is provided', () => {
    const { container } = render(<Button icon="⚔️">Attack</Button>);
    const iconEl = container.querySelector('.btn__icon');
    expect(iconEl).toBeInTheDocument();
    expect(iconEl!.textContent).toContain('⚔️');
    expect(iconEl!.getAttribute('aria-hidden')).toBe('true');
  });

  it('icon span appears before label span in DOM order', () => {
    const { container } = render(<Button icon="⚔️">Attack</Button>);
    const btn = container.querySelector('button')!;
    const children = [...btn.children];
    const iconIndex = children.findIndex((c) => c.classList.contains('btn__icon'));
    const labelIndex = children.findIndex((c) => c.classList.contains('btn__label'));
    expect(iconIndex).toBeLessThan(labelIndex);
  });

  it('renders correctly with icon only (no children)', () => {
    const { container } = render(<Button icon="⚔️" aria-label="Attack" />);
    const btn = screen.getByRole('button', { name: 'Attack' });
    expect(btn).toBeInTheDocument();
    // No label span when no children
    expect(container.querySelector('.btn__label')).not.toBeInTheDocument();
    expect(container.querySelector('.btn__icon')).toBeInTheDocument();
  });

  it('renders correctly with label only (no icon)', () => {
    const { container } = render(<Button>Label Only</Button>);
    expect(container.querySelector('.btn__label')).toBeInTheDocument();
    expect(container.querySelector('.btn__icon')).not.toBeInTheDocument();
  });

  it('renders JSX element as icon prop', () => {
    const icon = <span data-testid="custom-icon">★</span>;
    const { container } = render(<Button icon={icon}>Star</Button>);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(container.querySelector('.btn__icon')).toBeInTheDocument();
  });
});

// ─── CSS variable compliance ─────────────────────────────────────────────────

describe.skip('Button — CSS variable compliance', () => {
  it('no inline hardcoded hex colors on any variant', () => {
    const { container } = render(
      <>
        <Button type="primary">P</Button>
        <Button type="secondary">S</Button>
        <Button type="danger">D</Button>
        <Button type="ghost">G</Button>
      </>,
    );

    container.querySelectorAll('button').forEach((btn) => {
      const style = btn.getAttribute('style') ?? '';
      expect(style).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    });
  });

  it('all buttons share the base "btn" class', () => {
    const { container } = render(
      <>
        <Button type="primary">P</Button>
        <Button type="secondary">S</Button>
        <Button type="danger">D</Button>
        <Button type="ghost">G</Button>
      </>,
    );

    container.querySelectorAll('button').forEach((btn) => {
      expect(btn.className).toContain('btn');
    });
  });
});

// ─── Semantic HTML / Accessibility ───────────────────────────────────────────

describe.skip('Button — accessibility', () => {
  it('renders as a native <button> element', () => {
    const { container } = render(<Button>Semantic</Button>);
    expect(container.querySelector('button')).toBeInTheDocument();
  });

  it('has type="button" to prevent form submission by default', () => {
    const { container } = render(<Button>Not Submit</Button>);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('type')).toBe('button');
  });

  it('supports custom className passthrough', () => {
    render(<Button className="custom-class">Custom</Button>);
    const btn = screen.getByRole('button', { name: 'Custom' });
    expect(btn.className).toContain('custom-class');
    // Should also keep base classes
    expect(btn.className).toContain('btn');
  });

  it('passes through native button attributes (data-*, aria-*)', () => {
    render(
      <Button data-testid="my-btn" aria-describedby="help">
        Passthrough
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Passthrough' });
    expect(btn.getAttribute('data-testid')).toBe('my-btn');
    expect(btn.getAttribute('aria-describedby')).toBe('help');
  });

  it('combines variant + size + custom class without conflicts', () => {
    render(
      <Button type="danger" size="large" className="extra">
        Combined
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Combined' });
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('btn--danger');
    expect(btn.className).toContain('btn--large');
    expect(btn.className).toContain('extra');
  });
});

// ─── Additional coverage: disabled class, icon wrappers, variant×size matrix ─

describe.skip('Button — extended', () => {
  it('applies btn--disabled class when disabled', () => {
    render(<Button disabled>Off</Button>);
    expect(screen.getByRole('button').className).toContain('btn--disabled');
  });

  it('does not apply btn--disabled class when enabled', () => {
    render(<Button>On</Button>);
    expect(screen.getByRole('button').className).not.toContain('btn--disabled');
  });

  it('wraps icon in aria-hidden container with btn__icon class', () => {
    render(<Button icon={<svg data-testid="sword" />}>Strike</Button>);
    const iconWrapper = screen.getByTestId('sword').parentElement;
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true');
    expect(iconWrapper?.className).toContain('btn__icon');
  });

  it('wraps label text in btn__label span', () => {
    render(<Button>Labeled</Button>);
    expect(screen.getByText('Labeled').className).toContain('btn__label');
  });

  it('does not render icon wrapper when no icon provided', () => {
    const { container } = render(<Button>No icon</Button>);
    expect(container.querySelector('.btn__icon')).toBeNull();
  });

  it('always includes the base btn class', () => {
    render(<Button type="ghost" size="small">Base</Button>);
    expect(screen.getByRole('button').className).toContain('btn');
  });

  const variants = ['primary', 'secondary', 'danger', 'ghost'] as const;
  const sizes = ['small', 'medium', 'large'] as const;

  for (const variant of variants) {
    for (const size of sizes) {
      it(`renders ${variant}/${size} combination`, () => {
        render(<Button type={variant} size={size}>{variant} {size}</Button>);
        const btn = screen.getByRole('button');
        expect(btn.className).toContain(variant);
        expect(btn.className).toContain(size);
      });
    }
  }
});
