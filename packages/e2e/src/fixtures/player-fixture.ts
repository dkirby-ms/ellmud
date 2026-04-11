import { type Browser, type BrowserContext, type Page, expect } from '@playwright/test';

/** localStorage keys the client uses for auth state. */
const TOKEN_KEY = 'ellmud_token';
const PLAYER_KEY = 'ellmud_playerId';
const USERNAME_KEY = 'ellmud_username';

interface AuthResponse {
  token: string;
  playerId: string;
  username?: string;
}

interface CharacterSummary {
  id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * PlayerFixture wraps a Playwright BrowserContext as one "player".
 *
 * Each player gets its own isolated browser context (separate cookies,
 * localStorage, WebSocket connections) — perfect for multiplayer tests.
 */
export class PlayerFixture {
  readonly name: string;
  private browser: Browser;
  private context!: BrowserContext;
  private page!: Page;
  private token = '';
  private playerId = '';
  private username = '';
  private characterId = '';
  private baseURL: string;

  constructor(browser: Browser, name: string, baseURL = 'http://localhost:3000') {
    this.browser = browser;
    this.name = name;
    this.baseURL = baseURL;
  }

  /** Create a fresh browser context and page for this player. */
  private async ensureContext(): Promise<void> {
    if (!this.context) {
      this.context = await this.browser.newContext({ baseURL: this.baseURL });
      this.page = await this.context.newPage();
    }
  }

  /** POST /auth/register with local auth credentials. */
  async register(username: string, password: string): Promise<void> {
    await this.ensureContext();
    const response = await this.context.request.post('/auth/register', {
      data: { username, password },
    });
    expect(response.ok(), `Registration failed for ${username}: ${response.status()}`).toBeTruthy();
    const body: AuthResponse = await response.json();
    this.token = body.token;
    this.playerId = body.playerId;
    this.username = username;
  }

  /** POST /auth/login with stored credentials. */
  async login(): Promise<void> {
    // Token was already obtained during register — inject into localStorage.
    await this.ensureContext();
    await this.page.goto('/');
    await this.page.evaluate(
      ({ token, playerId, username }) => {
        localStorage.setItem('ellmud_token', token);
        localStorage.setItem('ellmud_playerId', playerId);
        localStorage.setItem('ellmud_username', username);
      },
      { token: this.token, playerId: this.playerId, username: this.username },
    );
  }

  /** POST /api/characters to create a character in the given zone. */
  async createCharacter(name: string, startingZoneSlug = 'the-reliquary'): Promise<void> {
    const response = await this.context.request.post('/api/characters', {
      headers: { Authorization: `Bearer ${this.token}` },
      data: { name, startingZoneSlug },
    });
    expect(response.ok(), `Character creation failed: ${response.status()}`).toBeTruthy();
    const body: { character: CharacterSummary } = await response.json();
    this.characterId = body.character.id;
  }

  /** PUT /api/characters/:id/select to activate this character. */
  async selectCharacter(characterId?: string): Promise<void> {
    const id = characterId ?? this.characterId;
    const response = await this.context.request.put(`/api/characters/${id}/select`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    expect(response.ok(), `Character select failed: ${response.status()}`).toBeTruthy();
  }

  /** Navigate to /zone and wait for the Colyseus WebSocket connection. */
  async enterZone(): Promise<void> {
    await this.selectCharacter();

    // Navigate to the zone page — the client reads localStorage for auth
    await this.page.goto('/zone');

    // Wait for the command input to be enabled — signals a live connection
    await this.page.waitForSelector(
      'input[aria-label="Command input"]:not([disabled])',
      { timeout: 20_000 },
    );
  }

  /** Type a command into the command input and submit it. */
  async sendCommand(text: string): Promise<void> {
    const input = this.page.locator('input[aria-label="Command input"]');
    await input.fill(text);
    await input.press('Enter');
  }

  /**
   * Wait for a message matching the given pattern to appear in the game terminal.
   * Uses Playwright's auto-waiting / polling.
   */
  async waitForMessage(
    textPattern: string | RegExp,
    options?: { timeout?: number },
  ): Promise<void> {
    const terminal = this.page.locator('[role="log"][aria-label="Game narrative"]');
    const pattern = typeof textPattern === 'string' ? new RegExp(textPattern, 'i') : textPattern;
    await expect(terminal).toContainText(pattern, {
      timeout: options?.timeout ?? 10_000,
    });
  }

  /** Return all visible messages in the game terminal. */
  async getMessages(): Promise<string[]> {
    const terminal = this.page.locator('[role="log"][aria-label="Game narrative"]');
    const messages = terminal.locator('div > *');
    const count = await messages.count();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await messages.nth(i).textContent();
      if (text) texts.push(text.trim());
    }
    return texts;
  }

  /** Access the underlying Playwright page for advanced assertions. */
  getPage(): Page {
    return this.page;
  }

  /** Access the underlying Playwright context. */
  getContext(): BrowserContext {
    return this.context;
  }

  /** Cleanup: close the browser context. */
  async cleanup(): Promise<void> {
    if (this.characterId && this.token) {
      try {
        await this.context.request.delete(`/api/characters/${this.characterId}`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
      } catch {
        // Best-effort cleanup — don't fail the test
      }
    }
    if (this.context) {
      await this.context.close();
    }
  }
}
