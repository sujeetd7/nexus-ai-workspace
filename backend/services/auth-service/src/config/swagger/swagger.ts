import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Nexus AI Workspace - Auth Service API",
      version: "1.0.0",
      description: "Enterprise Authentication Service APIs",
    },

    servers: [
      {
        url: "http://localhost:3001",
        description: "Local Development",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                },
                message: {
                  type: "string",
                },
              },
            },
            requestId: {
              type: "string",
            },
            timestamp: {
              type: "string",
            },
          },
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: ["./src/routes/**/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
