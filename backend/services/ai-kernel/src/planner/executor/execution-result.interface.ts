export interface ExecutionResult {
  success: boolean;

  output?: any;

  error?: Error;

  duration: number;
}
