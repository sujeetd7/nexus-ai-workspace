
export interface IKernelOptions {
  // Configuration options for the kernel (e.g., logging level, timeouts)
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  timeout?: number;
}
