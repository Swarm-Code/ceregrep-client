/**
 * OAuth Manager Singleton Instance
 * Provides global access to the OAuth manager
 */

import { OAuthManager } from './oauth-manager.js';
import { MultiProviderTokenStore } from './token-store.js';
import { AnthropicOAuthProvider } from './anthropic-oauth-provider.js';

let oauthManagerInstance: OAuthManager | null = null;

/**
 * Get or create the OAuth manager instance
 */
export function getOAuthManager(): OAuthManager {
  if (!oauthManagerInstance) {
    const tokenStore = new MultiProviderTokenStore();
    oauthManagerInstance = new OAuthManager(tokenStore);
  }
  return oauthManagerInstance;
}

/**
 * Initialize OAuth providers
 * Should be called once during app startup
 */
export function initializeOAuthProviders(
  addItemCallback?: (itemData: { type: string; text: string }, timestamp: number) => number
): void {
  const manager = getOAuthManager();

  // Register Anthropic provider
  const anthropicProvider = new AnthropicOAuthProvider(
    manager['tokenStore'], // Access private tokenStore
    addItemCallback
  );
  manager.registerProvider(anthropicProvider);
}

/**
 * Reset the OAuth manager (mainly for testing)
 */
export function resetOAuthManager(): void {
  oauthManagerInstance = null;
}
