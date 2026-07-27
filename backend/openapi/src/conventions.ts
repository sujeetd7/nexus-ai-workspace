import type { OpenApiDocument } from "./types.js";

export const OPENAPI_VERSION = "3.0.3";

export const bearerSecurityScheme = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
} as const;

export const standardErrorCodes = [
  "400",
  "401",
  "403",
  "404",
  "409",
  "413",
  "423",
  "429",
  "500",
  "502",
  "503",
] as const;

export function standardComponents(): OpenApiDocument["components"] {
  return {
    securitySchemes: {
      bearerAuth: bearerSecurityScheme,
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          requestId: { type: "string" },
          correlationId: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      GatewayErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              correlationId: { type: "string" },
            },
          },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1 },
          total: { type: "integer", minimum: 0 },
          nextCursor: { type: "string", nullable: true },
        },
      },
    },
  };
}

type ErrorStatus = (typeof standardErrorCodes)[number];

const defaultErrorDescriptions: Record<ErrorStatus, string> = {
  "400": "Validation error",
  "401": "Authentication required",
  "403": "Forbidden",
  "404": "Resource not found",
  "409": "Conflict",
  "413": "Payload too large",
  "423": "Account locked or unavailable",
  "429": "Rate limit exceeded",
  "500": "Internal server error",
  "502": "Upstream service error",
  "503": "Service unavailable",
};

export function errorRef(
  status: ErrorStatus,
  description?: string,
  schema: "ErrorResponse" | "GatewayErrorResponse" = "ErrorResponse",
): Record<string, unknown> {
  return {
    description: description ?? defaultErrorDescriptions[status],
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schema}` },
      },
    },
  };
}

export function jsonResponse(
  status: string,
  description: string,
  schema?: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema) {
    return { description };
  }
  return {
    description,
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

export function bearerSecurity(): Array<Record<string, string[]>> {
  return [{ bearerAuth: [] }];
}

export function standardErrorResponses(
  statuses: ErrorStatus[] = ["400", "401", "403", "404", "500"],
): Record<string, unknown> {
  const responses: Record<string, unknown> = {};
  for (const status of statuses) {
    responses[status] = errorRef(status);
  }
  return responses;
}

export function operation(
  operationId: string,
  summary: string,
  options: {
    tags: string[];
    description?: string;
    security?: Array<Record<string, string[]>> | [];
    requestBody?: Record<string, unknown>;
    parameters?: Record<string, unknown>[];
    responses: Record<string, unknown>;
  },
): Record<string, unknown> {
  return {
    operationId,
    summary,
    ...(options.description ? { description: options.description } : {}),
    tags: options.tags,
    ...(options.security !== undefined ? { security: options.security } : {}),
    ...(options.parameters ? { parameters: options.parameters } : {}),
    ...(options.requestBody ? { requestBody: options.requestBody } : {}),
    responses: options.responses,
  };
}

export function jsonRequestBody(
  schema: Record<string, unknown>,
  required = true,
): Record<string, unknown> {
  return {
    required,
    content: {
      "application/json": { schema },
    },
  };
}

export function pathParam(
  name: string,
  description: string,
  schema: Record<string, unknown> = { type: "string" },
): Record<string, unknown> {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema,
  };
}

export function queryParam(
  name: string,
  description: string,
  options: {
    required?: boolean;
    schema?: Record<string, unknown>;
  } = {},
): Record<string, unknown> {
  return {
    name,
    in: "query",
    required: options.required ?? false,
    description,
    schema: options.schema ?? { type: "string" },
  };
}

export function sseResponse(description: string): Record<string, unknown> {
  return {
    description,
    content: {
      "text/event-stream": {
        schema: {
          type: "string",
          description:
            "Server-Sent Events stream. Each event is `data: <json>\\n\\n`.",
        },
      },
    },
  };
}
