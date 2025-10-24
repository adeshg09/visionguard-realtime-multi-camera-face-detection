import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
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
  updateFrameSkipIntervalSchema,
} from "@/validators/camera.validator.js";
import { createCameraController } from "@/controllers/camera.controller.js";

export const createCameraRoutes = (prisma: PrismaClient) => {
  const cameraRoutes = new Hono();
  const cameraController = createCameraController(prisma);

  // All camera routes require authentication
  cameraRoutes.use("*", authMiddleware);

  // CRUD operations
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

  // Stream control
  cameraRoutes.post("/start-stream/:id", cameraController.startStream);
  cameraRoutes.post("/stop-stream/:id", cameraController.stopStream);

  // Stream status
  cameraRoutes.get("/get-stream-status/:id", cameraController.getStreamStatus);

  // Face detection and frame skip interval
  cameraRoutes.post(
    "/toggle-face-detection/:id",
    validateBody(toggleFaceDetectionSchema),
    cameraController.toggleFaceDetection
  );
  cameraRoutes.post(
    "/update-frame-skip-interval/:id",
    validateBody(updateFrameSkipIntervalSchema),
    cameraController.updateFrameSkipInterval
  );

  return cameraRoutes;
};
