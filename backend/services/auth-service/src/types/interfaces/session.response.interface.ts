export interface SessionResponse {
  id: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  lastUsedAt: Date;
  createdAt: Date;
  current?: boolean;
}
