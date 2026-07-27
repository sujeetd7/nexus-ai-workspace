import { AppError } from "./app-error";

/**
 * Upstream AI Kernel is unreachable, timed out, or returned a gateway failure.
 */
export class KernelUnavailableError extends AppError {
  constructor(message = "AI Kernel is unavailable") {
    super(message, 503, "KERNEL_UNAVAILABLE");
  }
}
