/**
 * EntraAuthService — OIDC authorization code flow with Entra External ID.
 *
 * Handles OAuth redirect and callback for Microsoft Entra External ID (CIAM).
 * Uses openid-client v6 for standards-compliant OIDC discovery and token exchange.
 */

import * as client from 'openid-client';

export interface EntraConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  /** Entra External ID (CIAM) tenant subdomain name — NOT the GUID. */
  tenantSubdomain: string;
  redirectUri: string;
}

export interface EntraUserInfo {
  oid: string;         // Object ID (unique user identifier)
  email?: string;      // User's email
  name?: string;       // Display name
  preferred_username?: string;
}

export class EntraAuthService {
  private config: client.Configuration | null = null;
  private readonly entraConfig: EntraConfig;

  constructor(entraConfig: EntraConfig) {
    this.entraConfig = entraConfig;
  }

  /**
   * Initialize the OIDC client using Entra External ID discovery.
   * For Entra External ID (CIAM), the subdomain is the tenant's custom name, not the GUID.
   * URL format: https://{subdomain}.ciamlogin.com/{tenantId}/v2.0
   */
  async initialize(): Promise<void> {
    const subdomain = this.entraConfig.tenantSubdomain || this.entraConfig.tenantId;
    const issuerUrl = new URL(
      `https://${subdomain}.ciamlogin.com/${this.entraConfig.tenantId}/v2.0`
    );

    try {
      this.config = await client.discovery(
        issuerUrl,
        this.entraConfig.clientId,
        this.entraConfig.clientSecret,
        client.ClientSecretPost(this.entraConfig.clientSecret),
      );
    } catch (err) {
      console.error('[EntraAuthService] OIDC discovery failed:', err);
      throw new Error('Failed to initialize Entra OIDC client', { cause: err });
    }
  }

  /**
   * Generate the authorization URL for Entra login redirect.
   * Returns { url, state, nonce } — caller must store state for CSRF validation.
   */
  getAuthorizationUrl(): { url: string; state: string; nonce: string } {
    if (!this.config) {
      throw new Error('EntraAuthService not initialized');
    }

    const state = client.randomState();
    const nonce = client.randomNonce();

    const parameters: Record<string, string> = {
      redirect_uri: this.entraConfig.redirectUri,
      scope: 'openid profile email',
      state,
      nonce,
    };

    const url = client.buildAuthorizationUrl(this.config, parameters);

    return { url: url.toString(), state, nonce };
  }

  /**
   * Handle the authorization callback — exchange code for tokens and return user info.
   * Validates state for CSRF protection.
   */
  async handleCallback(
    callbackUrl: URL,
    expectedState: string,
    expectedNonce: string,
  ): Promise<EntraUserInfo> {
    if (!this.config) {
      throw new Error('EntraAuthService not initialized');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await client.authorizationCodeGrant(
      this.config,
      callbackUrl,
      {
        expectedState,
        expectedNonce,
      },
    );

    // Extract user claims from ID token
    const claims = tokenResponse.claims();
    
    if (!claims || !claims.oid) {
      throw new Error('Invalid ID token: missing oid claim');
    }

    return {
      oid: claims.oid as string,
      email: claims.email as string | undefined,
      name: claims.name as string | undefined,
      preferred_username: claims.preferred_username as string | undefined,
    };
  }
}
