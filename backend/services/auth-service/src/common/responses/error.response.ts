export interface ErrorResponse {
  success: false;

  error: {
    code: string;
    message: string;
    details?: unknown;
  };

  requestId?: string;

  timestamp: string;
}