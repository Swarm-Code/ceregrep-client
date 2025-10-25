/**
 * Simplified DebugLogger for OAuth
 * Compatible with llxprt-code's DebugLogger interface but simplified
 */

export class DebugLogger {
  private namespace: string;
  private _enabled: boolean;

  constructor(namespace: string) {
    this.namespace = namespace;
    // Enable if DEBUG environment variable matches namespace
    this._enabled = this.shouldEnable(namespace);
  }

  private shouldEnable(namespace: string): boolean {
    const debugEnv = process.env.DEBUG;
    if (!debugEnv) return false;

    // Support wildcards
    const patterns = debugEnv.split(',').map(p => p.trim());
    return patterns.some(pattern => {
      if (pattern === '*') return true;
      if (pattern === namespace) return true;

      // Support wildcard matching
      if (pattern.includes('*')) {
        const regexPattern = pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*');
        return new RegExp(`^${regexPattern}$`).test(namespace);
      }

      return false;
    });
  }

  debug(messageOrFn: string | (() => string), ...args: unknown[]): void {
    if (!this._enabled) return;

    const message = typeof messageOrFn === 'function' ? messageOrFn() : messageOrFn;
    console.log(`[${this.namespace}]`, message, ...args);
  }

  log(messageOrFn: string | (() => string), ...args: unknown[]): void {
    this.debug(messageOrFn, ...args);
  }

  error(messageOrFn: string | (() => string), ...args: unknown[]): void {
    const message = typeof messageOrFn === 'function' ? messageOrFn() : messageOrFn;
    console.error(`[${this.namespace}]`, message, ...args);
  }

  warn(messageOrFn: string | (() => string), ...args: unknown[]): void {
    const message = typeof messageOrFn === 'function' ? messageOrFn() : messageOrFn;
    console.warn(`[${this.namespace}]`, message, ...args);
  }
}
