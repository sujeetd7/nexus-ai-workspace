export const userRepositoryMock = {
  create: jest.fn(),

  findByEmail: jest.fn(),

  findById: jest.fn(),

  updatePassword: jest.fn(),

  markEmailVerified: jest.fn(),

  incrementFailedLoginAttempts: jest.fn(),

  resetFailedLoginAttempts: jest.fn(),

  lockUser: jest.fn(),
};
