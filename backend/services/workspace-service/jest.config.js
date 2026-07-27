module.exports = {
  preset: "ts-jest",
  testEnvironment: require.resolve("jest-environment-node"),
  roots: ["<rootDir>/tests"],
  testMatch: ["**/tests/**/*.spec.ts"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "\\.spec\\.js$",
    "\\.js\\.map$",
  ],
  moduleFileExtensions: ["ts", "js"],
  moduleNameMapper: {
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@routes/(.*)$": "<rootDir>/src/routes/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@repositories/(.*)$": "<rootDir>/src/repositories/$1",
    "^@middleware/(.*)$": "<rootDir>/src/middleware/$1",
    "^@generated/prisma$": "<rootDir>/src/generated/prisma",
  },
};
