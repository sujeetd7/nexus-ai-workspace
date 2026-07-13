import { DefaultRetryPolicy } from "./default-retry.policy";
import { RetryExecutor } from "./retry-executor";

export class RetryModule {
  private readonly executor: RetryExecutor;

  constructor() {
    this.executor = new RetryExecutor(new DefaultRetryPolicy());
  }

  public getExecutor(): RetryExecutor {
    return this.executor;
  }
}
