import { UserRole } from "../../src/types/auth/roles";

export const userFixture = {
  id: "user-1",

  email: "test@test.com",

  passwordHash: "hash",

  role: UserRole.USER,

  firstName: "John",

  lastName: "Doe",

  emailVerified: true,

  isActive: true,

  failedLoginAttempts: 0,

  lockedUntil: null,

  createdAt: new Date(),

  updatedAt: new Date(),
};
