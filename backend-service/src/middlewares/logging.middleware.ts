/* Imports */
import type { Context, Next } from "hono";

/* Local Imports */
import { logger } from "@/libs/logger.lib.js";

// ----------------------------------------------------------------------

/**
 * Middleware to log request details.
 *
 * @param {Context} c - Hono context
 * @param {Next} next - Next middleware function
 * @return {Promise<void>} - Resolves when middleware processing is complete
 */

export const requestLogger = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();

    await next();

    const duration = Date.now() - start;

    logger.info("Request completed", {
      method: c.req.method,
      url: c.req.url,
      status: c.res.status,
      duration: `${duration}ms`,
      userAgent: c.req.header("user-agent"),
    });
  };
};
