import { RetryPolicy } from "./retry-policy.interface";

export class RetryExecutor {
  constructor(private readonly policy: RetryPolicy) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 1;

    while (true) {
      try {
        return await operation();
      } catch (error) {
        if (!this.policy.shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = this.policy.nextDelay(attempt);

        console.warn(`Retry ${attempt} after ${delay} ms`);

        await new Promise((resolve) => setTimeout(resolve, delay));

        attempt++;
      }
    }
  }
}
