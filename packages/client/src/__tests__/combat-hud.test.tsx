/**
 * combat-hud.test.tsx — Tests for Combat HUD component per GDD §6.4
 * 
 * Tests cover:
 * - Stamina bar rendering (already implemented in ZoneExploration)
 * - Target panel with HP tier and telegraph indicator
 * - Tab cycling through hostile targets
 * - Ability cooldown overlay
 * - Group frames with role indicators
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CombatHUD } from '../components/CombatHUD.js';
import type { EnemyStatus } from '../store.js';

describe('CombatHUD Component', () => {
  describe('Target Panel', () => {
    it('renders target panel with enemy name and HP tier', () => {
      const enemyStatus: EnemyStatus = {
        name: 'Corrupted Sentinel',
        hp: 40,
        maxHp: 100,
        hpTier: 'Wounded',
        telegraphedAction: null,
      };

      render(<CombatHUD enemyStatus={enemyStatus} />);

      expect(screen.getByTestId('target-panel')).toBeInTheDocument();
      expect(screen.getByText('Corrupted Sentinel')).toBeInTheDocument();
      expect(screen.getByText('Wounded')).toBeInTheDocument();
    });

    it('displays telegraph intent indicator when enemy is telegraphing', () => {
      const enemyStatus: EnemyStatus = {
        name: 'Drowned Revenant',
        hp: 80,
        maxHp: 100,
        hpTier: 'Uninjured',
        telegraphedAction: 'Crushing Blow',
      };

      render(<CombatHUD enemyStatus={enemyStatus} />);

      const indicator = screen.getByTestId('telegraph-indicator');
      expect(indicator).toBeInTheDocument();
      expect(within(indicator).getByText(/Crushing Blow/)).toBeInTheDocument();
    });

    it('shows correct HP tier colors', () => {
      const testCases: Array<{ hpTier: EnemyStatus['hpTier']; expectedColor: string }> = [
        { hpTier: 'Uninjured', expectedColor: 'var(--color-success)' },
        { hpTier: 'Wounded', expectedColor: 'var(--color-warning)' },
        { hpTier: 'Badly Wounded', expectedColor: 'var(--color-warning)' },
        { hpTier: 'Near Death', expectedColor: 'var(--color-danger)' },
      ];

      testCases.forEach(({ hpTier, expectedColor }) => {
        const { unmount } = render(
          <CombatHUD
            enemyStatus={{
              name: 'Test Enemy',
              hp: 50,
              maxHp: 100,
              hpTier,
              telegraphedAction: null,
            }}
          />
        );

        const tierLabel = screen.getByText(hpTier);
        expect(tierLabel).toHaveStyle({ color: expectedColor });
        unmount();
      });
    });

    it('renders HP bar with correct width based on HP percentage', () => {
      const enemyStatus: EnemyStatus = {
        name: 'Test Enemy',
        hp: 30,
        maxHp: 100,
        hpTier: 'Badly Wounded',
        telegraphedAction: null,
      };

      render(<CombatHUD enemyStatus={enemyStatus} />);

      const progressBar = screen.getByRole('progressbar', { name: /Target health/ });
      expect(progressBar).toBeInTheDocument();
      
      const fill = progressBar.querySelector('div');
      expect(fill).toHaveStyle({ width: '30%' });
    });
  });

  describe('Tab Cycling Through Targets', () => {
    it('cycles to next target when Tab key is pressed', async () => {
      const user = userEvent.setup();
      const onTargetChange = vi.fn();
      const targets = [
        { id: 'enemy1', name: 'Goblin Scout', hp: 50, maxHp: 50 },
        { id: 'enemy2', name: 'Goblin Warrior', hp: 80, maxHp: 100 },
        { id: 'enemy3', name: 'Goblin Shaman', hp: 40, maxHp: 60 },
      ];

      render(
        <CombatHUD
          enemyStatus={{
            name: 'Goblin Scout',
            hp: 50,
            maxHp: 50,
            hpTier: 'Uninjured',
            telegraphedAction: null,
          }}
          availableTargets={targets}
          onTargetChange={onTargetChange}
        />
      );

      expect(screen.getByText('1/3')).toBeInTheDocument();

      // Press Tab to cycle
      await user.tab();

      expect(onTargetChange).toHaveBeenCalledWith('enemy2');
    });

    it('shows all available targets in target list', () => {
      const targets = [
        { id: 'enemy1', name: 'Zombie', hp: 30, maxHp: 50 },
        { id: 'enemy2', name: 'Skeleton', hp: 20, maxHp: 40 },
      ];

      render(
        <CombatHUD
          enemyStatus={{
            name: 'Zombie',
            hp: 30,
            maxHp: 50,
            hpTier: 'Wounded',
            telegraphedAction: null,
          }}
          availableTargets={targets}
        />
      );

      const targetList = screen.getByText(/Available Targets/);
      expect(targetList).toBeInTheDocument();
      
      // Verify both targets appear in the list (Zombie appears as both main target and in list)
      const zombieElements = screen.getAllByText('Zombie');
      expect(zombieElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Skeleton')).toBeInTheDocument();
    });

    it('wraps around to first target after reaching last target', async () => {
      const user = userEvent.setup();
      const onTargetChange = vi.fn();
      const targets = [
        { id: 'enemy1', name: 'Rat', hp: 10, maxHp: 10 },
        { id: 'enemy2', name: 'Spider', hp: 15, maxHp: 15 },
      ];

      render(
        <CombatHUD
          enemyStatus={{
            name: 'Rat',
            hp: 10,
            maxHp: 10,
            hpTier: 'Uninjured',
            telegraphedAction: null,
          }}
          availableTargets={targets}
          onTargetChange={onTargetChange}
        />
      );

      // Cycle through: Rat -> Spider
      await user.tab();
      expect(onTargetChange).toHaveBeenCalledWith('enemy2');

      // Cycle through: Spider -> Rat (wrap around)
      await user.tab();
      expect(onTargetChange).toHaveBeenCalledWith('enemy1');
    });
  });

  describe('Ability Cooldown Overlay', () => {
    it('renders ability buttons with hotkeys', () => {
      const abilities = [
        { id: 'strike', name: 'Strike', cooldown: 0, maxCooldown: 0, hotkey: 1 },
        { id: 'heavy', name: 'Heavy Strike', cooldown: 0, maxCooldown: 3, hotkey: 2 },
        { id: 'dodge', name: 'Dodge', cooldown: 0, maxCooldown: 2, hotkey: 3 },
      ];

      render(<CombatHUD enemyStatus={null} abilities={abilities} />);

      expect(screen.getByTestId('ability-cooldowns')).toBeInTheDocument();
      expect(screen.getByTestId('ability-strike')).toBeInTheDocument();
      expect(screen.getByText('Strike')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows cooldown overlay when ability is on cooldown', () => {
      const abilities = [
        { id: 'heavy', name: 'Heavy Strike', cooldown: 2, maxCooldown: 3, hotkey: 1 },
      ];

      render(<CombatHUD enemyStatus={null} abilities={abilities} />);

      const cooldownOverlay = screen.getByTestId('cooldown-overlay-heavy');
      expect(cooldownOverlay).toBeInTheDocument();
      expect(within(cooldownOverlay).getByText('2')).toBeInTheDocument();
    });

    it('greys out ability button during cooldown', () => {
      const abilities = [
        { id: 'dodge', name: 'Dodge', cooldown: 1, maxCooldown: 2, hotkey: 1 },
      ];

      render(<CombatHUD enemyStatus={null} abilities={abilities} />);

      const button = screen.getByTestId('ability-dodge');
      expect(button).toHaveClass('opacity-50');
    });

    it('does not show cooldown overlay when ability is ready', () => {
      const abilities = [
        { id: 'strike', name: 'Strike', cooldown: 0, maxCooldown: 0, hotkey: 1 },
      ];

      render(<CombatHUD enemyStatus={null} abilities={abilities} />);

      expect(screen.queryByTestId('cooldown-overlay-strike')).not.toBeInTheDocument();
    });
  });

  describe('Group Frames', () => {
    it('renders group frames with member names and HP bars', () => {
      const groupMembers = [
        { id: 'tank1', name: 'Thorin', hp: 150, maxHp: 200, role: 'tank' as const, threat: 100 },
        { id: 'healer1', name: 'Elara', hp: 80, maxHp: 100, role: 'healer' as const, threat: 20 },
        { id: 'dps1', name: 'Zephyr', hp: 60, maxHp: 80, role: 'damage' as const, threat: 50 },
      ];

      render(<CombatHUD enemyStatus={null} groupMembers={groupMembers} />);

      expect(screen.getByTestId('group-frames')).toBeInTheDocument();
      expect(screen.getByText(/GROUP \(3\)/)).toBeInTheDocument();
      expect(screen.getByTestId('group-member-tank1')).toBeInTheDocument();
      expect(screen.getByText('Thorin')).toBeInTheDocument();
      expect(screen.getByText('Elara')).toBeInTheDocument();
      expect(screen.getByText('Zephyr')).toBeInTheDocument();
    });

    it('sorts group members by threat level (highest first)', () => {
      const groupMembers = [
        { id: 'dps1', name: 'Low Threat', hp: 50, maxHp: 50, role: 'damage' as const, threat: 10 },
        { id: 'tank1', name: 'High Threat', hp: 100, maxHp: 100, role: 'tank' as const, threat: 100 },
        { id: 'dps2', name: 'Mid Threat', hp: 60, maxHp: 60, role: 'damage' as const, threat: 50 },
      ];

      const { container } = render(<CombatHUD enemyStatus={null} groupMembers={groupMembers} />);

      const memberFrames = container.querySelectorAll('[data-testid^="group-member-"]');
      const names = Array.from(memberFrames).map(frame => 
        frame.querySelector('.font-serif')?.textContent
      );

      expect(names).toEqual(['High Threat', 'Mid Threat', 'Low Threat']);
    });

    it('displays role-specific icons for group members', () => {
      const groupMembers = [
        { id: 'tank1', name: 'Tank', hp: 100, maxHp: 100, role: 'tank' as const, threat: 100 },
        { id: 'healer1', name: 'Healer', hp: 80, maxHp: 100, role: 'healer' as const, threat: 20 },
        { id: 'dps1', name: 'DPS', hp: 60, maxHp: 80, role: 'damage' as const, threat: 50 },
      ];

      render(<CombatHUD enemyStatus={null} groupMembers={groupMembers} />);

      // Check that each member frame exists (icons are rendered via Lucide components)
      expect(screen.getByTestId('group-member-tank1')).toBeInTheDocument();
      expect(screen.getByTestId('group-member-healer1')).toBeInTheDocument();
      expect(screen.getByTestId('group-member-dps1')).toBeInTheDocument();
    });

    it('displays HP percentage for each group member', () => {
      const groupMembers = [
        { id: 'member1', name: 'Alice', hp: 75, maxHp: 100, role: 'damage' as const, threat: 30 },
        { id: 'member2', name: 'Bob', hp: 30, maxHp: 60, role: 'tank' as const, threat: 80 },
      ];

      render(<CombatHUD enemyStatus={null} groupMembers={groupMembers} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('uses appropriate HP bar colors based on health percentage', () => {
      const groupMembers = [
        { id: 'healthy', name: 'Healthy', hp: 80, maxHp: 100, role: 'damage' as const, threat: 10 },
        { id: 'wounded', name: 'Wounded', hp: 40, maxHp: 100, role: 'damage' as const, threat: 20 },
        { id: 'critical', name: 'Critical', hp: 20, maxHp: 100, role: 'damage' as const, threat: 30 },
      ];

      const { container } = render(<CombatHUD enemyStatus={null} groupMembers={groupMembers} />);

      const healthyBar = container.querySelector('[data-testid="group-member-healthy"] .h-1');
      const woundedBar = container.querySelector('[data-testid="group-member-wounded"] .h-1');
      const criticalBar = container.querySelector('[data-testid="group-member-critical"] .h-1');

      expect(healthyBar?.querySelector('.bg-success')).toBeInTheDocument();
      expect(woundedBar?.querySelector('.bg-warning')).toBeInTheDocument();
      expect(criticalBar?.querySelector('.bg-danger')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('renders multiple HUD sections together during combat', () => {
      const enemyStatus: EnemyStatus = {
        name: 'Boss Enemy',
        hp: 500,
        maxHp: 1000,
        hpTier: 'Wounded',
        telegraphedAction: 'Devastating Smash',
      };

      const abilities = [
        { id: 'ability1', name: 'Strike', cooldown: 0, maxCooldown: 0, hotkey: 1 },
        { id: 'ability2', name: 'Block', cooldown: 1, maxCooldown: 3, hotkey: 2 },
      ];

      const groupMembers = [
        { id: 'p1', name: 'Player1', hp: 100, maxHp: 100, role: 'tank' as const, threat: 100 },
        { id: 'p2', name: 'Player2', hp: 80, maxHp: 100, role: 'healer' as const, threat: 30 },
      ];

      render(
        <CombatHUD
          enemyStatus={enemyStatus}
          abilities={abilities}
          groupMembers={groupMembers}
        />
      );

      expect(screen.getByTestId('combat-hud')).toBeInTheDocument();
      expect(screen.getByTestId('target-panel')).toBeInTheDocument();
      expect(screen.getByTestId('telegraph-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('ability-cooldowns')).toBeInTheDocument();
      expect(screen.getByTestId('group-frames')).toBeInTheDocument();
    });

    it('does not render target panel when not in combat', () => {
      render(<CombatHUD enemyStatus={null} />);

      expect(screen.queryByTestId('target-panel')).not.toBeInTheDocument();
    });
  });
});
