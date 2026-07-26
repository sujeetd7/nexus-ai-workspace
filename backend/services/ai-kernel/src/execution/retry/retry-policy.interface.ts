export interface RetryPolicy {
  maxAttempts: number;

  initialDelayMs: number;

  maxDelayMs: number;

  exponentialBackoff: boolean;

  jitter: boolean;

  shouldRetry(error: unknown, attempt: number): boolean;

  nextDelay(attempt: number): number;
}
