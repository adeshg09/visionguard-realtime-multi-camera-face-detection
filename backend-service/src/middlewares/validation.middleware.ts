/* Imports */
import type { MiddlewareHandler } from "hono";

/* Relative Imports */
import { ZodType, ZodError } from "zod";

/* Local Imports */
import { logger } from "@/libs/logger.lib.js";
import { RESPONSE_MESSAGES, STATUS_CODES } from "../constants/index.js";
import { errorResponse } from "../utils/response.js";

// ----------------------------------------------------------------------

/**
 * Middleware to validate request body using Zod schema.
 *
 * @param {ZodType<any>} schema - Zod schema to validate request body
 * @return {MiddlewareHandler} - Middleware handler function
 */

export const validateBody = (schema: ZodType<any>): MiddlewareHandler => {
  return async (c, next) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);
      c.set("validatedData", validatedData);
      await next();
    } catch (error) {
      logger.error("Validation error:", error);

      const validationError = {
        message: "Validation failed",
        details:
          error instanceof ZodError
            ? error.issues
            : error instanceof Error
            ? error.message
            : "Invalid input",
      };

      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_MESSAGES.VALIDATION_ERROR || "Validation failed",
        validationError
      );
    }
  };
};

/** Middleware to validate query parameters using Zod schema.
 *
 * @param {ZodType<any>} schema - Zod schema to validate query parameters
 * @return {MiddlewareHandler} - Middleware handler function
 */

export const validateQuery = (schema: ZodType<any>): MiddlewareHandler => {
  return async (c, next) => {
    try {
      const query = c.req.query();
      const validatedData = schema.parse({
        ...query,
        page: query.page ? parseInt(query.page) : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
      });
      c.set("validatedQuery", validatedData);
      await next();
    } catch (error) {
      logger.error("Query validation error:", error);

      const validationError = {
        message: "Query validation failed",
        details:
          error instanceof ZodError
            ? error.issues
            : error instanceof Error
            ? error.message
            : "Invalid query parameters",
      };

      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_MESSAGES.VALIDATION_ERROR || "Query validation failed",
        validationError
      );
    }
  };
};
