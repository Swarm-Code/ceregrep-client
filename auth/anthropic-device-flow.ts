/**
 * Anthropic OAuth 2.0 Device Flow Implementation
 * Adapted from llxprt-code
 *
 * Implements OAuth 2.0 device authorization grant flow for Anthropic Claude API.
 */

import { DeviceCodeResponse, OAuthToken } from './types.js';
import { createHash, randomBytes } from 'crypto';

/**
 * Configuration for Anthropic device flow authentication
 */
interface AnthropicFlowConfig {
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
}

/**
 * Anthropic-specific OAuth 2.0 device flow implementation.
 */
export class AnthropicDeviceFlow {
  private config: AnthropicFlowConfig;
  private codeVerifier?: string;
  private _codeChallenge?: string;
  private state?: string;

  constructor(config?: Partial<AnthropicFlowConfig>) {
    const defaultConfig: AnthropicFlowConfig = {
      clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
      authorizationEndpoint: 'https://claude.ai/oauth/authorize',
      tokenEndpoint: 'https://console.anthropic.com/v1/oauth/token',
      scopes: ['org:create_api_key', 'user:profile', 'user:inference'],
    };

    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Generates PKCE code verifier and challenge using S256 method
   */
  private generatePKCE(): { verifier: string; challenge: string } {
    // Generate a random code verifier (43-128 characters)
    const _verifier = randomBytes(32).toString('base64url');
    this.codeVerifier = _verifier;

    // Generate code challenge using S256 (SHA256 hash)
    const challenge = createHash('sha256')
      .update(_verifier)
      .digest('base64url');
    this._codeChallenge = challenge;

    return { verifier: _verifier, challenge };
  }

  /**
   * Initiates the OAuth flow by constructing the authorization URL.
   */
  async initiateDeviceFlow(): Promise<DeviceCodeResponse> {
    // Generate PKCE parameters
    const { verifier, challenge } = this.generatePKCE();

    // Use verifier as state
    this.state = verifier;

    // Build authorization URL with PKCE parameters
    const params = new URLSearchParams({
      code: 'true',
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
      scope: this.config.scopes.join(' '),
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: verifier,
    });

    const authUrl = `${this.config.authorizationEndpoint}?${params.toString()}`;

    return {
      device_code: verifier,
      user_code: 'ANTHROPIC',
      verification_uri: 'https://console.anthropic.com/oauth/authorize',
      verification_uri_complete: authUrl,
      expires_in: 1800, // 30 minutes
      interval: 5,
    };
  }

  /**
   * Exchange authorization code for access token (PKCE flow)
   */
  async exchangeCodeForToken(authCodeWithState: string): Promise<OAuthToken> {
    if (!this.codeVerifier) {
      throw new Error('No PKCE code verifier found - OAuth flow not initialized');
    }

    // Split code and state - format: code#state
    const splits = authCodeWithState.split('#');
    const authCode = splits[0];
    const stateFromResponse = splits[1] || this.state;

    // Send JSON request (not form-encoded)
    const requestBody = {
      grant_type: 'authorization_code',
      code: authCode,
      state: stateFromResponse,
      client_id: this.config.clientId,
      redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
      code_verifier: this.codeVerifier,
    };

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange authorization code: ${error}`);
    }

    const data = await response.json();
    return this.mapTokenResponse(data);
  }

  /**
   * Refreshes an expired access token using a refresh token.
   */
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Anthropic token: ${error}`);
    }

    const data = await response.json();
    return this.mapTokenResponse(data);
  }

  /**
   * Maps Anthropic's token response to our standard OAuthToken format.
   */
  private mapTokenResponse(data: unknown): OAuthToken {
    const tokenData = data as Record<string, unknown>;
    return {
      access_token: tokenData.access_token as string,
      expiry: Math.floor(Date.now() / 1000) + ((tokenData.expires_in as number) || 3600),
      refresh_token: tokenData.refresh_token as string | undefined,
      scope: tokenData.scope as string | undefined,
      token_type: 'Bearer',
    };
  }
}
