/**
 * AnsiToolbar.test.tsx — Tests for ANSI tag insertion toolbar.
 *
 * Verifies:
 * - Tag insertion at cursor (empty selection)
 * - Tag wrapping around selected text
 * - All tag types (colors, bright colors, modifiers)
 * - Cursor positioning after insertion
 * - Multiple sequential insertions
 * - Tag insertion in empty textarea
 * - All buttons render correctly
 *
 * NOTE: document.execCommand undo/redo behavior (Ctrl+Z) cannot be meaningfully
 * tested in jsdom. These tests focus on the tag insertion behavior itself.
 *
 * Testing checklist:
 * - [x] All color buttons render (black, red, green, yellow, blue, magenta, cyan, white)
 * - [x] All bright color buttons render
 * - [x] All modifier buttons render (bold, dim, italic, underline)
 * - [x] Clicking button inserts [tag][/tag] at cursor (empty selection)
 * - [x] Clicking button wraps selected text with [tag]selected[/tag]
 * - [x] Cursor positioned between tags after insertion (empty selection)
 * - [x] Cursor positioned after wrapped text after insertion (with selection)
 * - [x] Multiple insertions work correctly
 * - [x] Tag insertion works in empty textarea
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import AnsiToolbar from '../AnsiToolbar.js';

// ─── Mock document.execCommand ──────────────────────────────────────────────

/**
 * Mock document.execCommand for jsdom.
 * 
 * jsdom doesn't implement execCommand, but we can simulate its behavior
 * for "insertText" by manually updating the textarea value and firing
 * an input event (which is what execCommand does in real browsers).
 */
beforeEach(() => {
  // Mock document.execCommand
  document.execCommand = vi.fn((command: string, _showUI: boolean, value: string) => {
    if (command === 'insertText') {
      const activeElement = document.activeElement as HTMLTextAreaElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA') {
        const { selectionStart, selectionEnd, value: currentValue } = activeElement;
        const before = currentValue.slice(0, selectionStart);
        const after = currentValue.slice(selectionEnd);
        activeElement.value = before + value + after;
        
        // Fire input event to trigger React onChange
        const event = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(event);
        
        return true;
      }
    }
    return false;
  }) as (command: string, showUI?: boolean, value?: string) => boolean;

  // Mock requestAnimationFrame for cursor positioning tests
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    cb();
    return 0;
  });
});

// ─── Mock Data ───────────────────────────────────────────────────────────────

const COLORS = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
];

const BRIGHT_COLORS = [
  "bright-black", "bright-red", "bright-green", "bright-yellow",
  "bright-blue", "bright-magenta", "bright-cyan", "bright-white",
];

const MODIFIERS = ["bold", "dim", "italic", "underline"];

// ─── Test Wrapper ────────────────────────────────────────────────────────────

/**
 * Wrapper component that provides a textarea ref and onChange handler.
 * This simulates how AnsiToolbar is used in AnsiTextarea.
 */
function TestWrapper({
  initialValue = "",
  onValueChange,
}: {
  initialValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleInsert = (newValue: string) => {
    // In the new implementation, this won't be called since execCommand
    // updates the textarea value directly via the input event.
    // This callback is kept for potential future use or backward compatibility.
    if (textareaRef.current) {
      textareaRef.current.value = newValue;
      onValueChange?.(newValue);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    // This is how value changes are captured with execCommand approach
    onValueChange?.((e.target as HTMLTextAreaElement).value);
  };

  return (
    <div>
      <AnsiToolbar textareaRef={textareaRef} onInsert={handleInsert} />
      <textarea
        ref={textareaRef}
        defaultValue={initialValue}
        onInput={handleInput}
        data-testid="test-textarea"
      />
    </div>
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Set the cursor position and selection in a textarea.
 */
function setSelection(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number = start
) {
  textarea.focus();
  textarea.setSelectionRange(start, end);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnsiToolbar', () => {
  // ── 1. Rendering all buttons ─────────────────────────────────────────────

  describe('button rendering', () => {
    it('renders all standard color buttons', () => {
      render(<TestWrapper />);
      
      COLORS.forEach((color) => {
        expect(screen.getByText(color)).toBeInTheDocument();
      });
    });

    it('renders all bright color buttons', () => {
      render(<TestWrapper />);
      
      BRIGHT_COLORS.forEach((color) => {
        expect(screen.getByText(color)).toBeInTheDocument();
      });
    });

    it('renders all modifier buttons', () => {
      render(<TestWrapper />);
      
      MODIFIERS.forEach((modifier) => {
        expect(screen.getByText(modifier)).toBeInTheDocument();
      });
    });

    it('renders separator between colors and modifiers', () => {
      const { container } = render(<TestWrapper />);
      const separator = container.querySelector('.w-px.h-4.bg-\\[\\#2A2B35\\]');
      expect(separator).toBeInTheDocument();
    });

    it('all buttons have correct title attributes', () => {
      render(<TestWrapper />);
      
      const redButton = screen.getByText('red');
      expect(redButton).toHaveAttribute('title', '[red]…[/red]');

      const boldButton = screen.getByText('bold');
      expect(boldButton).toHaveAttribute('title', '[bold]…[/bold]');
    });
  });

  // ── 2. Tag insertion at cursor (empty selection) ─────────────────────────

  describe('tag insertion at cursor', () => {
    it('inserts [red][/red] at cursor in empty textarea', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText('red'));

      expect(textarea.value).toBe('[red][/red]');
    });

    it('inserts [bold][/bold] at cursor in empty textarea', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText('bold'));

      expect(textarea.value).toBe('[bold][/bold]');
    });

    it('inserts tag at cursor position in middle of text', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="Hello World" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 6); // After "Hello "

      await user.click(screen.getByText('blue'));

      expect(textarea.value).toBe('Hello [blue][/blue]World');
    });

    it('inserts tag at start of existing text', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="Text here" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText('green'));

      expect(textarea.value).toBe('[green][/green]Text here');
    });

    it('inserts tag at end of existing text', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="Text here" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 9); // After all text

      await user.click(screen.getByText('yellow'));

      expect(textarea.value).toBe('Text here[yellow][/yellow]');
    });
  });

  // ── 3. Tag wrapping around selected text ─────────────────────────────────

  describe('tag wrapping selection', () => {
    it('wraps selected text with [red]selected[/red]', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="Hello World" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0, 5); // Select "Hello"

      await user.click(screen.getByText('red'));

      expect(textarea.value).toBe('[red]Hello[/red] World');
    });

    it('wraps selected text with [bold]selected[/bold]', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="Important text" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0, 9); // Select "Important"

      await user.click(screen.getByText('bold'));

      expect(textarea.value).toBe('[bold]Important[/bold] text');
    });

    it('wraps middle portion of text', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="The quick brown fox" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 10, 15); // Select "brown"

      await user.click(screen.getByText('cyan'));

      expect(textarea.value).toBe('The quick [cyan]brown[/cyan] fox');
    });

    it('wraps entire text content', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="Wrap it all" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0, 11); // Select all

      await user.click(screen.getByText('italic'));

      expect(textarea.value).toBe('[italic]Wrap it all[/italic]');
    });

    it('wraps single character', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="A B C" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 2, 3); // Select "B"

      await user.click(screen.getByText('underline'));

      expect(textarea.value).toBe('A [underline]B[/underline] C');
    });
  });

  // ── 4. All tag types work correctly ──────────────────────────────────────

  describe('all tag types', () => {
    it.each(COLORS)('inserts %s color tag correctly', async (color) => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText(color));

      expect(textarea.value).toBe(`[${color}][/${color}]`);
    });

    it.each(BRIGHT_COLORS)('inserts %s bright color tag correctly', async (color) => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText(color));

      expect(textarea.value).toBe(`[${color}][/${color}]`);
    });

    it.each(MODIFIERS)('inserts %s modifier tag correctly', async (modifier) => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText(modifier));

      expect(textarea.value).toBe(`[${modifier}][/${modifier}]`);
    });
  });

  // ── 5. Cursor positioning after insertion ────────────────────────────────

  describe('cursor positioning', () => {
    it('positions cursor between tags when inserting at empty position', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText('red'));

      // Cursor should be at position 5: [red]|[/red]
      expect(textarea.selectionStart).toBe(5);
      expect(textarea.selectionEnd).toBe(5);
    });

    it('positions cursor after wrapped text when wrapping selection', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="Hello" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0, 5); // Select "Hello"

      await user.click(screen.getByText('bold'));

      // Cursor should be after insertion: [bold]Hello[/bold]|
      expect(textarea.selectionStart).toBe(18); // Length of "[bold]Hello[/bold]"
      expect(textarea.selectionEnd).toBe(18);
    });

    it('maintains focus on textarea after tag insertion', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText('green'));

      expect(document.activeElement).toBe(textarea);
    });
  });

  // ── 6. Multiple sequential insertions ────────────────────────────────────

  describe('multiple insertions', () => {
    it('inserts multiple tags sequentially', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      
      // First insertion
      setSelection(textarea, 0);
      await user.click(screen.getByText('red'));
      expect(textarea.value).toBe('[red][/red]');

      // Second insertion at end
      setSelection(textarea, 11);
      await user.click(screen.getByText('bold'));
      expect(textarea.value).toBe('[red][/red][bold][/bold]');
    });

    it('allows wrapping text multiple times (nested tags)', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="Text" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      
      // First wrap
      setSelection(textarea, 0, 4);
      await user.click(screen.getByText('red'));
      expect(textarea.value).toBe('[red]Text[/red]');

      // Second wrap (wrap the whole thing)
      setSelection(textarea, 0, 15);
      await user.click(screen.getByText('bold'));
      expect(textarea.value).toBe('[bold][red]Text[/red][/bold]');
    });

    it('inserts tags between existing tags', async () => {
      const user = userEvent.setup();
      render(<TestWrapper initialValue="[red]Text[/red]" />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      
      // Insert in the middle of "Text"
      setSelection(textarea, 7); // After "Te"
      await user.click(screen.getByText('blue'));
      expect(textarea.value).toBe('[red]Te[blue][/blue]xt[/red]');
    });
  });

  // ── 7. Edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles tag insertion when textarea ref is null', async () => {
      const user = userEvent.setup();
      const textareaRef = { current: null };
      const onInsert = vi.fn();
      
      render(<AnsiToolbar textareaRef={textareaRef} onInsert={onInsert} />);
      
      await user.click(screen.getByText('red'));
      
      // Should not throw, onInsert should not be called
      expect(onInsert).not.toHaveBeenCalled();
    });

    it('handles rapid successive clicks on different buttons', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      // Click multiple buttons quickly
      await user.click(screen.getByText('red'));
      await user.click(screen.getByText('bold'));
      await user.click(screen.getByText('italic'));

      // Each click should have updated the textarea
      expect(textarea.value).toContain('[red]');
      expect(textarea.value).toContain('[bold]');
      expect(textarea.value).toContain('[italic]');
    });

    it('triggers onInsert callback with new value', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<TestWrapper onValueChange={onValueChange} />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 0);

      await user.click(screen.getByText('red'));

      expect(onValueChange).toHaveBeenCalledWith('[red][/red]');
    });

    it('preserves text before and after insertion point', async () => {
      const user = userEvent.setup();
      const originalText = "Start Middle End";
      render(<TestWrapper initialValue={originalText} />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 6, 12); // Select "Middle"

      await user.click(screen.getByText('cyan'));

      expect(textarea.value).toBe('Start [cyan]Middle[/cyan] End');
    });

    it('works with multiline text', async () => {
      const user = userEvent.setup();
      const multilineText = "Line 1\nLine 2\nLine 3";
      render(<TestWrapper initialValue={multilineText} />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 7, 13); // Select "Line 2"

      await user.click(screen.getByText('green'));

      expect(textarea.value).toBe('Line 1\n[green]Line 2[/green]\nLine 3');
    });

    it('handles selection across newlines', async () => {
      const user = userEvent.setup();
      const multilineText = "Line 1\nLine 2";
      render(<TestWrapper initialValue={multilineText} />);
      
      const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
      setSelection(textarea, 4, 11); // Select " 1\nLine"

      await user.click(screen.getByText('yellow'));

      expect(textarea.value).toBe('Line[yellow] 1\nLine[/yellow] 2');
    });
  });

  // ── 8. Button accessibility ──────────────────────────────────────────────

  describe('button accessibility', () => {
    it('all buttons have type="button" to prevent form submission', () => {
      const { container } = render(<TestWrapper />);
      const buttons = container.querySelectorAll('button');
      
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('color buttons have appropriate ARIA labels via title', () => {
      render(<TestWrapper />);
      
      const redButton = screen.getByText('red');
      expect(redButton).toHaveAttribute('title', '[red]…[/red]');
    });

    it('modifier buttons have appropriate ARIA labels via title', () => {
      render(<TestWrapper />);
      
      const boldButton = screen.getByText('bold');
      expect(boldButton).toHaveAttribute('title', '[bold]…[/bold]');
    });
  });
});
