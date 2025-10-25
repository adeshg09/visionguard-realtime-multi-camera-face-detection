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
  createCameraSchema,
  paginationSchema,
  toggleFaceDetectionSchema,
  updateCameraSchema,
  updateFpsSchema,
} from "@/validators/camera.validator.js";
import { createCameraController } from "@/controllers/camera.controller.js";

// ----------------------------------------------------------------------

/**
 * Route handler that Creates all camera-related routes.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Hono} - Configured camera routes
 */
export const createCameraRoutes = (prisma: PrismaClient) => {
  /* Routes */
  const cameraRoutes = new Hono();
  const cameraController = createCameraController(prisma);

  // ----------------------------------------------------------------------

  /* Apply authentication to all routes */
  cameraRoutes.use("*", authMiddleware);

  /* Camera CRUD */
  cameraRoutes.post(
    "/create-camera",
    validateBody(createCameraSchema),
    cameraController.createCamera
  );
  cameraRoutes.get(
    "/get-cameras",
    validateQuery(paginationSchema),
    cameraController.getCameras
  );
  cameraRoutes.get("/get-camera-by-id/:id", cameraController.getCameraById);
  cameraRoutes.patch(
    "/update-camera/:id",
    validateBody(updateCameraSchema),
    cameraController.updateCamera
  );
  cameraRoutes.delete("/delete-camera/:id", cameraController.deleteCamera);

  /* Camera stream control */
  cameraRoutes.post("/start-stream/:id", cameraController.startStream);
  cameraRoutes.post("/stop-stream/:id", cameraController.stopStream);

  /* Stream status */
  cameraRoutes.get("/get-stream-status/:id", cameraController.getStreamStatus);

  /* Face detection & fps */
  cameraRoutes.post(
    "/toggle-face-detection/:id",
    validateBody(toggleFaceDetectionSchema),
    cameraController.toggleFaceDetection
  );
  cameraRoutes.post(
    "/update-fps/:id",
    validateBody(updateFpsSchema),
    cameraController.updateFps
  );

  // ----------------------------------------------------------------------

  /* Return camera routes */
  return cameraRoutes;
};
