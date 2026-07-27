/**
 * Packaging / disposition smoke checks (no network).
 */
describe("duplicate gateway disposition", () => {
  it("retired package cannot be mistaken for production name", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const retired = require("../../../../services/api-gateway/package.json");
    expect(retired.name).toBe("@nexus/api-gateway-retired");
    expect(retired.private).toBe(true);
  });

  it("canonical package is uniquely named", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const canonical = require("../../package.json");
    expect(canonical.name).toBe("@nexus/api-gateway");
  });
});
