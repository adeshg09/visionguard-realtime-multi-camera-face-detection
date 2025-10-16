import type { Context } from "hono";
import { errorResponse } from "@/utils/response.js";
import { STATUS_CODES, RESPONSE_MESSAGES } from "@/constants/index.js";
import { logger } from "@/libs/logger.lib.js";

export const errorHandler = (err: Error, c: Context) => {
  logger.error("Unhandled error:", {
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
  });

  // Database errors - Unique constraint violation
  if (err.message.includes("Unique constraint")) {
    return errorResponse(
      c,
      STATUS_CODES.CONFLICT,
      RESPONSE_MESSAGES.RESOURCE_EXISTS || "Resource already exists",
      { message: "Resource already exists", type: "UNIQUE_CONSTRAINT_ERROR" }
    );
  }

  // Database errors - Record not found
  if (err.message.includes("Record to update not found")) {
    return errorResponse(
      c,
      STATUS_CODES.NOT_FOUND,
      RESPONSE_MESSAGES.NOT_FOUND || "Resource not found",
      { message: "Resource not found", type: "RECORD_NOT_FOUND_ERROR" }
    );
  }

  // Default internal server error
  return errorResponse(
    c,
    STATUS_CODES.INTERNAL_SERVER_ERROR,
    RESPONSE_MESSAGES.SERVER_ERROR || "Internal server error",
    err
  );
};
