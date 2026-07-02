import { Request } from "express";
import { ApiError } from "../middleware/error/api-error";

export function requireUser(req: Request) {
  if (!req.user) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  return req.user;
}
