import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
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

export const createAlertRoutes = (prisma: PrismaClient) => {
  const alertRoutes = new Hono();
  const alertController = createAlertController(prisma);

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

  return alertRoutes;
};
