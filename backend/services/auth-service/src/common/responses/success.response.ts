export interface SuccessResponse<T> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
}
