/* Imports */
import type { Context } from "hono";

/* Relative Imports */
import { PrismaClient } from "@prisma/client";

/* Local Imports */
import {
  RESPONSE_SUCCESS_MESSAGES,
  RESPONSE_ERROR_MESSAGES,
  STATUS_CODES,
  RESPONSE_MESSAGES,
} from "@/constants/index.js";
import { PaginationParams } from "@/types/index.js";
import { successResponse, errorResponse } from "@/utils/response.js";
import {
  CameraResponse,
  CreateCameraRequest,
  StartStreamResponse,
  ToggleFaceDetectionRequest,
  UpdateCameraRequest,
  UpdateFpsRequest,
} from "@/dtos/camera.dto.js";
import { createCameraService } from "@/services/camera.service.js";
import { createWorkerService } from "@/services/worker.service.js";

// ----------------------------------------------------------------------

/**
 * Controller to handle all camera-related operations.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {object} - Camera controller with all handlers
 */
export const createCameraController = (prisma: PrismaClient) => {
  /* Services */
  const cameraService = createCameraService(prisma);
  const workerService = createWorkerService();

  // ----------------------------------------------------------------------

  /**
   * Create a new camera.
   *
   * @route POST /api/cameras/create-camera
   */
  const createCamera = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraData = c.get("validatedData") as CreateCameraRequest;

      const camera = await cameraService.createCamera(user.id, cameraData);

      return successResponse(
        c,
        STATUS_CODES.CREATED,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.CAMERA_CREATED,
        camera
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.CAMERA_CREATE_FAILED,
        error
      );
    }
  };

  /**
   * Fetch all cameras for the logged-in user.
   *
   * @route GET /api/cameras/get-cameras
   */
  const getCameras = async (c: Context) => {
    try {
      const user = c.get("user");
      const pagination = c.get("validatedQuery") as PaginationParams;

      const result = await cameraService.getCamerasByUserId(
        user.id,
        pagination
      );

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.CAMERAS_RETRIEVED,
        { cameras: result.data, pagination: result.pagination }
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.CAMERAS_RETRIEVE_FAILED,
        error
      );
    }
  };

  /**
   * Fetch a single camera by ID.
   *
   * @route GET /api/cameras/get-camera-by-id/:id
   */
  const getCameraById = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      const result = await cameraService.getCameraById(cameraId, user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.CAMERA_RETRIEVED,
        { camera: result }
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.CAMERA_RETRIEVE_FAILED,
        error
      );
    }
  };

  /**
   * Update camera details.
   *
   * @route PUT /api/cameras/update-camera/:id
   */
  const updateCamera = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");
      const updateData = c.get("validatedData") as UpdateCameraRequest;

      const camera = await cameraService.updateCamera(
        cameraId,
        user.id,
        updateData
      );

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.CAMERA_UPDATED,
        camera
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.CAMERA_UPDATE_FAILED,
        error
      );
    }
  };

  /**
   * Delete a camera and stop stream if active.
   *
   * @route DELETE /api/cameras/delete-camera/:id
   */
  const deleteCamera = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      const camera = await cameraService.getCameraById(cameraId, user.id);
      if (!camera) throw new Error(RESPONSE_ERROR_MESSAGES.CAMERA_NOT_FOUND);

      if (camera.isOnline) {
        try {
          await workerService.stopStream(cameraId);
          console.log(`Stream stopped for camera ${cameraId}`);
        } catch (err) {
          console.warn(`Failed to stop stream for camera ${cameraId}:`, err);
        }
      }

      await cameraService.deleteCamera(cameraId, user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.CAMERA_DELETED
      );
    } catch (error) {
      console.error("Delete camera error:", error);
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.CAMERA_DELETE_FAILED,
        error
      );
    }
  };

  /**
   * Start a live camera stream.
   *
   * @route POST /api/cameras/start-stream/:id
   */
  const startStream = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      const camera = (await cameraService.getCameraById(
        cameraId,
        user.id
      )) as CameraResponse;
      const result: any = await workerService.startStream(camera);

      console.log("start stream backend res", result);

      if (result.status.response_code === 200) {
        const updatedCamera = await cameraService.updateCamera(
          cameraId,
          user.id,
          {
            isOnline: true,
            webrtcUrl: result.data?.webrtcUrl || null,
            hlsUrl: result.data?.hlsUrl || null,
            rtmpUrl: result.data?.rtmpUrl || null,
            lastOnlineAt: new Date(),
          }
        );

        return successResponse(
          c,
          STATUS_CODES.OK,
          RESPONSE_MESSAGES.SUCCESS,
          result.message,
          { camera: updatedCamera } as StartStreamResponse
        );
      }
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.STREAM_START_FAILED,
        error
      );
    }
  };

  /**
   * Stop an active camera stream.
   *
   * @route POST /api/cameras/stop-stream/:id
   */
  const stopStream = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      const camera = await cameraService.getCameraById(cameraId, user.id);
      if (!camera) throw new Error(RESPONSE_ERROR_MESSAGES.CAMERA_NOT_FOUND);

      const result = await workerService.stopStream(cameraId);

      if (result.status.response_code === 200) {
        const updatedCamera = await cameraService.updateCamera(
          cameraId,
          user.id,
          {
            isOnline: false,
            webrtcUrl: null,
            hlsUrl: null,
            rtmpUrl: null,
            lastOfflineAt: new Date(),
          }
        );

        return successResponse(
          c,
          STATUS_CODES.OK,
          RESPONSE_MESSAGES.SUCCESS,
          RESPONSE_SUCCESS_MESSAGES.STREAM_STOPPED,
          { camera: updatedCamera }
        );
      }
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.STREAM_STOP_FAILED,
        error
      );
    }
  };

  /**
   * Retrieve the current stream status.
   *
   * @route GET /api/cameras/get-stream-status/:id
   */
  const getStreamStatus = async (c: Context) => {
    try {
      const cameraId = c.req.param("id");
      const result = await workerService.getStreamStatus(cameraId);

      if (result.status.response_code === 200) {
        return successResponse(
          c,
          STATUS_CODES.OK,
          RESPONSE_MESSAGES.SUCCESS,
          RESPONSE_SUCCESS_MESSAGES.STREAM_STATUS_FETCHED,
          result
        );
      }
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.STREAM_STATUS_FETCH_FAILED,
        error
      );
    }
  };

  /**
   * Toggle face detection for a specific camera.
   *
   * @route POST /api/cameras/toggle-face-detection/:id
   */
  const toggleFaceDetection = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");
      const { enabled } = c.get("validatedData") as ToggleFaceDetectionRequest;

      const camera = await cameraService.getCameraById(cameraId, user.id);
      if (!camera) throw new Error(RESPONSE_ERROR_MESSAGES.CAMERA_NOT_FOUND);

      const result = await workerService.toggleFaceDetection(cameraId, enabled);

      if (result.status.response_code === 200) {
        const updatedCamera = await cameraService.updateCamera(
          cameraId,
          user.id,
          {
            faceDetectionEnabled: enabled,
          }
        );

        return successResponse(
          c,
          STATUS_CODES.OK,
          RESPONSE_MESSAGES.SUCCESS,
          result.message,
          updatedCamera
        );
      }
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.FACE_DETECTION_TOGGLE_FAILED,
        error
      );
    }
  };

  /**
   * Update FPS settings for a camera.
   *
   * @route POST /api/cameras/update-fps/:id
   */
  const updateFps = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");
      const { targetFPS } = c.get("validatedData") as UpdateFpsRequest;

      // Get camera to check current maxFPS
      const camera = await cameraService.getCameraById(cameraId, user.id);
      if (!camera) throw new Error(RESPONSE_ERROR_MESSAGES.CAMERA_NOT_FOUND);

      // Validate targetFPS doesn't exceed camera capability
      if (targetFPS > (camera.maxFPS || 30)) {
        throw new Error(`FPS cannot exceed camera maximum of ${camera.maxFPS}`);
      }

      // Update in database
      const updatedCamera = await cameraService.updateCamera(
        cameraId,
        user.id,
        { targetFPS }
      );

      // Forward to worker service for real-time update
      const result = await workerService.updateFps(cameraId, targetFPS);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        result.message,
        updatedCamera
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.FPS_UPDATE_FAILED,
        error
      );
    }
  };

  // ----------------------------------------------------------------------

  /* Return all controller functions */
  return {
    createCamera,
    getCameras,
    getCameraById,
    updateCamera,
    deleteCamera,
    startStream,
    stopStream,
    getStreamStatus,
    toggleFaceDetection,
    updateFps,
  };
};
