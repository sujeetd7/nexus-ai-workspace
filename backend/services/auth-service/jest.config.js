module.exports = {
  preset: "ts-jest",

  testEnvironment: require.resolve("jest-environment-node"),

  roots: ["<rootDir>/tests"],

  setupFiles: ["<rootDir>/tests/setup-env.ts"],

  moduleFileExtensions: ["ts", "js"],

  collectCoverage: true,

  coverageDirectory: "coverage",

  moduleNameMapper: {
    "^@db$": "<rootDir>/src/prisma/client.ts",
    "^@shared-types/(.*)$": "<rootDir>/src/types/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@repositories/(.*)$": "<rootDir>/src/repositories/$1",
    "^@middleware/(.*)$": "<rootDir>/src/middleware/$1",
    "^@tokens/(.*)$": "<rootDir>/src/tokens/$1",
    "^@security/(.*)$": "<rootDir>/src/security/$1",
    "^@schemas/(.*)$": "<rootDir>/src/schemas/$1",
    "^@routes/(.*)$": "<rootDir>/src/routes/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
