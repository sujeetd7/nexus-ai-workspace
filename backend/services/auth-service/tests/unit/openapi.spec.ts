import {
  assertUniqueOperationIds,
  assertValidOpenApiDocument,
  compareStableRoutes,
} from "@nexus/openapi";
import { authOpenApiSpec, authStableRoutes } from "../../src/openapi/spec";

describe("auth-service OpenAPI", () => {
  it("generates valid spec with unique operation IDs", () => {
    expect(assertValidOpenApiDocument(authOpenApiSpec)).toEqual([]);
    expect(assertUniqueOperationIds(authOpenApiSpec)).toEqual([]);
    expect(authOpenApiSpec.components?.securitySchemes).toHaveProperty(
      "bearerAuth",
    );
  });

  it("documents all stable auth routes", () => {
    const drift = compareStableRoutes(authStableRoutes, authOpenApiSpec);
    expect(drift.undocumented).toEqual([]);
  });
});
