/**
 * User Role Enum
 *
 * Defines the available user roles in the system.
 * This is a TypeScript enum that mirrors the Prisma UserRole enum.
 */
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
}

/**
 * Type guard to check if a value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Get all user roles as an array
 */
export function getUserRoles(): UserRole[] {
  return Object.values(UserRole);
}
