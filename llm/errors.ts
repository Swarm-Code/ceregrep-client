/**
 * Custom error types for LLM operations
 */

/**
 * Error thrown when a 400 Bad Request occurs
 * Signals that the request should be retried from the previous state
 */
export class BadRequestRetryError extends Error {
  constructor(
    message: string,
    public readonly originalError: any,
    public readonly requestDetails?: any,
  ) {
    super(message);
    this.name = 'BadRequestRetryError';
  }
}
