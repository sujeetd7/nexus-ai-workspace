/**
 * Trusted internal identity headers.
 * Only trustworthy when injected by the Gateway after access-token verification.
 * Client-supplied values MUST be stripped/overwritten before proxying.
 */
export const TRUSTED_IDENTITY_HEADERS = [
  "x-user-id",
  "x-user-role",
  "x-user-email",
] as const;

export const CORRELATION_HEADERS = [
  "x-request-id",
  "x-correlation-id",
] as const;

export function stripClientIdentityHeaders(
  headers: Record<string, unknown>,
): void {
  for (const header of TRUSTED_IDENTITY_HEADERS) {
    delete headers[header];
    delete headers[header.toLowerCase()];
  }
}

export function injectVerifiedIdentity(
  headers: Record<string, unknown>,
  user?: { id: string; role?: string; email?: string },
): void {
  stripClientIdentityHeaders(headers);

  if (!user?.id) {
    return;
  }

  headers["x-user-id"] = user.id;
  if (user.role) {
    headers["x-user-role"] = user.role;
  }
  if (user.email) {
    headers["x-user-email"] = user.email;
  }
}
