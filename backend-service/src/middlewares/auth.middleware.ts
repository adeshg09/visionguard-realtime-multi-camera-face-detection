/* Imports */
import type { MiddlewareHandler } from "hono";

/* Local Imports */
import { envConfig } from "@/config/env.config.js";
import { RESPONSE_MESSAGES, STATUS_CODES } from "@/constants/index.js";
import { logger } from "@/libs/logger.lib.js";
import { errorResponse } from "@/utils/response.js";
import { verifyToken } from "@/utils/tokens.js";

// ----------------------------------------------------------------------

/**
 * Authentication middleware to protect routes.
 * @param {MiddlewareHandler} c - Hono context
 * @param {Function} next - Next middleware function
 * @return {Promise<void>} - Resolves when middleware processing is complete
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    // Worker authentication
    const backendWorkerApiKey = c.req.header("X-Backend-Worker-API-Key");
    if (
      backendWorkerApiKey &&
      backendWorkerApiKey === envConfig.BACKEND_WORKER_API_KEY
    ) {
      c.set("worker", true);
      return await next();
    }

    // User authentication
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(
        c,
        STATUS_CODES.UNAUTHORIZED,
        RESPONSE_MESSAGES.UNAUTHORIZED,
        { message: "Authorization token required", type: "MISSING_TOKEN" }
      );
    }

    const token = authHeader.substring(7);

    const decoded = verifyToken(token, envConfig.ACCESS_TOKEN_SECRET as string);

    // Add user info to context
    c.set("user", {
      id: decoded?.userId,
      role: decoded?.role,
    });

    await next();
  } catch (error) {
    logger.error("Auth middleware error:", error);
    return errorResponse(
      c,
      STATUS_CODES.UNAUTHORIZED,
      RESPONSE_MESSAGES.UNAUTHORIZED || "Authentication failed",
      {
        message: "Invalid or expired token",
        type: "TOKEN_VERIFICATION_FAILED",
        originalError: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};
