module.exports = {
  preset: "ts-jest",
  testEnvironment: require.resolve("jest-environment-node"),
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["ts", "js"],
  moduleNameMapper: {
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@repositories/(.*)$": "<rootDir>/src/repositories/$1",
    "^@generated/(.*)$": "<rootDir>/src/generated/$1",
  },
};
