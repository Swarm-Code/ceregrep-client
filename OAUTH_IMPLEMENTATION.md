# Claude Code OAuth Implementation

This document describes the OAuth implementation for Claude Code in the ceregrep-client.

## Overview

Claude Code (via OAuth) has been implemented as a model provider option, allowing users to authenticate with their Claude Pro or Max accounts and use Claude models through OAuth instead of API keys.

## Implementation Details

### Core Auth Files (auth/)

All auth files have been copied from llxprt-code and adapted for ceregrep-client:

- **auth/types.ts** - OAuth token and response type definitions
- **auth/token-store.ts** - Multi-provider token storage in `~/.ceregrep/oauth/`
- **auth/anthropic-device-flow.ts** - OAuth 2.0 Device Flow with PKCE for Anthropic
- **auth/oauth-errors.ts** - Comprehensive error handling system
- **auth/oauth-manager.ts** - OAuth manager for coordinating providers
- **auth/anthropic-oauth-provider.ts** - Anthropic-specific OAuth provider implementation
- **auth/browser-utils.ts** - Secure browser launching utilities
- **auth/DebugLogger.ts** - Simplified debug logging
- **auth/oauth-manager-instance.ts** - Singleton OAuth manager instance

### Configuration

**config/schema.ts** has been updated to include OAuth configuration:

```typescript
oauth: z.object({
  enabledProviders: z.record(z.boolean()).optional(),
}).optional()
```

### UI Components

**tui/components/OAuthCodeDialog.tsx** - Dialog for entering OAuth authorization codes
- Prompts user to paste the authorization code from browser
- Handles code submission to OAuth provider
- Supports keyboard shortcuts (Enter, Escape, Ctrl+L)

### Integration Points

#### 1. App.tsx
- Added OAuth dialog state management
- Checks for global `__oauth_needs_code` flag to trigger dialog
- Handles OAuth code submission to the OAuth manager

#### 2. ModelManager.tsx
- Added "Claude Code (OAuth)" as a provider option
- Special OAuth view showing authentication status
- Login/logout functionality with keyboard shortcuts (L key)
- Real-time authentication status checking

## OAuth Flow

1. User navigates to `/model` command
2. Selects "Claude Code (OAuth)" from provider list
3. Views authentication status
4. Presses 'L' to login
5. OAuth manager initiates device flow
6. Browser opens to Anthropic's OAuth page
7. User authorizes the application
8. User returns to CLI and pastes authorization code in dialog
9. OAuth manager exchanges code for access token
10. Token is stored in `~/.ceregrep/oauth/anthropic.json`

## Features

- **Secure Token Storage**: Tokens stored with 0600 permissions in `~/.ceregrep/oauth/`
- **Automatic Token Refresh**: Expired tokens are automatically refreshed
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **Browser Integration**: Automatically opens browser for authentication
- **Status Management**: Real-time authentication status display

## File Structure

```
auth/
├── types.ts                      # OAuth type definitions
├── token-store.ts                # Token persistence
├── anthropic-device-flow.ts      # PKCE flow implementation
├── anthropic-oauth-provider.ts   # Provider implementation
├── oauth-manager.ts              # Manager coordinating providers
├── oauth-manager-instance.ts     # Singleton instance
├── oauth-errors.ts               # Error handling
├── browser-utils.ts              # Browser utilities
└── DebugLogger.ts                # Debug logging

tui/components/
├── OAuthCodeDialog.tsx           # Code input dialog
├── ModelManager.tsx              # Updated with OAuth view
└── App.tsx                       # Integrated OAuth handling

config/
└── schema.ts                     # Updated with OAuth config
```

## OAuth Configuration

OAuth tokens are stored in:
- **Path**: `~/.ceregrep/oauth/anthropic.json`
- **Permissions**: 0600 (read/write for owner only)
- **Format**: JSON with access_token, refresh_token, expiry, etc.

## OAuth Endpoints

- **Authorization**: https://claude.ai/oauth/authorize
- **Token Exchange**: https://console.anthropic.com/v1/oauth/token
- **Client ID**: 9d1c250a-e61b-44d9-88ed-5944d1962f5e
- **Scopes**: org:create_api_key, user:profile, user:inference

## Security

- PKCE (Proof Key for Code Exchange) for authorization flow
- Secure token storage with file permissions
- Automatic token refresh
- No API keys stored in plaintext

## Usage

1. Run the client: `npm start`
2. Type `/model` to open model manager
3. Select "Claude Code (OAuth)"
4. Press 'L' to login
5. Complete OAuth flow in browser
6. Paste authorization code when prompted
7. Start using Claude models via OAuth

## Future Enhancements

- [ ] Support for multiple OAuth providers (Gemini, etc.)
- [ ] OAuth token expiration warnings
- [ ] Automatic re-authentication on token expiry
- [ ] OAuth token introspection
- [ ] Session management UI

## Notes

- OAuth tokens start with `sk-ant-oat` prefix
- Tokens are valid for the duration specified by Anthropic
- Logout removes tokens from local storage
- Re-authentication required after logout
