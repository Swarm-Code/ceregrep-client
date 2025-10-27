/**
 * Type declarations for react-devtools-core
 * Allows React DevTools integration in Ink-based CLI apps
 */

declare module 'react-devtools-core' {
  export interface DevToolsOptions {
    host?: string;
    port?: number;
  }

  export function initDevTools(options?: DevToolsOptions): void;
}
