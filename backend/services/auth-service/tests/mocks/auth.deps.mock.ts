export const emailVerificationRepositoryMock = {
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  findByUserId: jest.fn(),
  markUsed: jest.fn(),
  invalidateUserTokens: jest.fn(),
  deleteExpired: jest.fn().mockResolvedValue(0),
};

export const passwordResetRepositoryMock = {
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  markUsed: jest.fn(),
  invalidateUserTokens: jest.fn(),
  deleteExpired: jest.fn(),
};

export const emailVerificationPublisherMock = {
  publishRequested: jest.fn().mockResolvedValue(undefined),
};

export const secureTokenServiceMock = {
  generateUrlSafeToken: jest.fn().mockReturnValue("secure-test-token"),
};
