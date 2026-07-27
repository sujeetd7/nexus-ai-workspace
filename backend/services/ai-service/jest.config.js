module.exports = {
  preset: "ts-jest",
  testEnvironment: require.resolve("jest-environment-node"),
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["ts", "js"],
};
