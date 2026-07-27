import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

import type { OpenApiDocument } from "./types.js";

export function mountExpressOpenApiDocs(
  app: Express,
  spec: OpenApiDocument,
  basePath = "/docs",
): void {
  app.get(`${basePath}/json`, (_req, res) => {
    res.json(spec);
  });

  app.use(basePath, swaggerUi.serve);
  app.get(
    basePath,
    swaggerUi.setup(spec, {
      customSiteTitle: spec.info.title,
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
}
