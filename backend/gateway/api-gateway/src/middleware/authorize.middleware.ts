import { gatewayError } from "../errors/gateway-error";

type UserRole = string;

/**
 * Optional role gate. Domain authorization remains with product services.
 * Gateway does not invent roles — it only checks claims already on the token.
 */
export function authorize(roles: UserRole[]) {
  return async (req: any, reply: any) => {
    if (!req.user) {
      return reply
        .status(401)
        .send(gatewayError("unauthorized", "Authentication required", req.correlationId));
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return reply
        .status(403)
        .send(gatewayError("forbidden", "Insufficient permissions", req.correlationId));
    }
  };
}
