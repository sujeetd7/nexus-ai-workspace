module.exports = {
  preset: "ts-jest",
  testEnvironment: require.resolve("jest-environment-node"),
  testMatch: ["**/__tests__/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js"],
};
