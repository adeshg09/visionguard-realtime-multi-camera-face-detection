/* Imports */
import { Hono } from "hono";

/* Relative Imports */
import { PrismaClient } from "@prisma/client";

/* Local Imports */
import { RESPONSE_MESSAGES, STATUS_CODES } from "@/constants/index.js";
import { successResponse } from "@/utils/response.js";
import { createAuthRoutes } from "./auth.route.js";
import { createCameraRoutes } from "./camera.route.js";
import { createAlertRoutes } from "./alert.route.js";

// ----------------------------------------------------------------------

/**
 * Route handler that creates all API routes.
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {object} - Configured API routes
 */

export const createRoutes = (prisma: PrismaClient) => {
  const api = new Hono();

  // Health Check
  api.get("/health", (c) => {
    return successResponse(
      c,
      STATUS_CODES.OK,
      RESPONSE_MESSAGES.SUCCESS,
      "VisionGuard Backend Service is running",
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "VisionGuard Backend Service",
        version: "1.0.0",
        environment: process.env.NODE_ENV,
      }
    );
  });

  // API routes
  api.route("/auth", createAuthRoutes(prisma));
  api.route("/cameras", createCameraRoutes(prisma));
  api.route("/alerts", createAlertRoutes(prisma));

  return api;
};
