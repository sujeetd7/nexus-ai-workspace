import { UserRole } from "@prisma/client";
import { Permission } from "../../types/auth/permissions";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_DELETE,
    Permission.PROFILE_UPDATE,
  ],

  [UserRole.MANAGER]: [Permission.USER_READ, Permission.PROFILE_UPDATE],

  [UserRole.USER]: [Permission.PROFILE_UPDATE],
};
