import { ZodType } from "zod";
import { RequestHandler } from "express";

export const validate =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error:unknown) {
      next(error);
    }
  };