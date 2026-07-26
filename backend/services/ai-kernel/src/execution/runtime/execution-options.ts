export interface ExecutionOptions {
  timeout?: number;

  maxRetries?: number;

  continueOnError?: boolean;

  streaming?: boolean;

  parallel?: boolean;
}
