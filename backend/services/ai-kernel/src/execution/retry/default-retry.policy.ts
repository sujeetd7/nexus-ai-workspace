import { RetryPolicy } from "./retry-policy.interface";

export class DefaultRetryPolicy implements RetryPolicy {
  readonly maxAttempts = 3;

  readonly initialDelayMs = 500;

  readonly maxDelayMs = 5000;

  readonly exponentialBackoff = true;

  readonly jitter = true;

  public shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.maxAttempts) {
      return false;
    }

    return true;
  }

  public nextDelay(attempt: number): number {
    let delay = this.initialDelayMs;

    if (this.exponentialBackoff) {
      delay *= Math.pow(2, attempt - 1);
    }

    delay = Math.min(delay, this.maxDelayMs);

    if (this.jitter) {
      delay += Math.floor(Math.random() * 200);
    }

    return delay;
  }
}
