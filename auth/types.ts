/**
 * OAuth types for Ceregrep Client
 * Adapted from llxprt-code
 */

import { z } from 'zod';

/**
 * OAuth token storage schema
 */
export const OAuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expiry: z.number(), // Unix timestamp
  scope: z.string().nullable().optional(),
  token_type: z.literal('Bearer'),
});

/**
 * Device code response schema
 */
export const DeviceCodeResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string().url(),
  verification_uri_complete: z.string().url().optional(),
  expires_in: z.number(),
  interval: z.number().optional(),
});

/**
 * Token response schema
 */
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().nullable().optional(),
});

/**
 * Auth status schema
 */
export const AuthStatusSchema = z.object({
  provider: z.string(),
  authenticated: z.boolean(),
  authType: z.enum(['oauth', 'api-key', 'none']),
  expiresIn: z.number().optional(), // seconds until expiry
  oauthEnabled: z.boolean().optional(),
});

// Export TypeScript types inferred from schemas
export type OAuthToken = z.infer<typeof OAuthTokenSchema>;
export type DeviceCodeResponse = z.infer<typeof DeviceCodeResponseSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
