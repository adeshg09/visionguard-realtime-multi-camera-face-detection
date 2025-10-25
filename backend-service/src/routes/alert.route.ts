/* Imports */
import { Hono } from "hono";

/* Relative Imports */
import { PrismaClient } from "@prisma/client";

/* Local Imports */
import { authMiddleware } from "@/middlewares/auth.middleware.js";
import {
  validateBody,
  validateQuery,
} from "@/middlewares/validation.middleware.js";
import {
  alertsQuerySchema,
  createAlertSchema,
} from "@/validators/alert.validator.js";
import { createAlertController } from "@/controllers/alert.controller.js";

// ----------------------------------------------------------------------

/**
 * Creates routes for alert-related operations.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {object} - Alert routes with all handlers
 */

export const createAlertRoutes = (prisma: PrismaClient) => {
  /* Routes */
  const alertRoutes = new Hono();

  /* Controller */
  const alertController = createAlertController(prisma);

  /* Alert CRUD */
  // Worker service endpoint (authenticated via API key)
  alertRoutes.post(
    "/create-alert",
    authMiddleware,
    validateBody(createAlertSchema),
    alertController.createAlert
  );

  // User endpoints (authenticated via JWT)
  alertRoutes.get(
    "/get-alerts",
    authMiddleware,
    validateQuery(alertsQuerySchema),
    alertController.getAlerts
  );

  alertRoutes.get(
    "/get-alert-by-id/:id",
    authMiddleware,
    alertController.getAlertById
  );

  alertRoutes.get(
    "/get-recent-alerts-by-camera/:cameraId",
    authMiddleware,
    alertController.getRecentAlertsByCamera
  );

  alertRoutes.get(
    "/get-camera-alert-stats/:cameraId",
    authMiddleware,
    alertController.getCameraAlertStats
  );

  /* Return alert routes */
  return alertRoutes;
};
