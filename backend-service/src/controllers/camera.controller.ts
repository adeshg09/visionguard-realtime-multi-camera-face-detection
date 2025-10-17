import type { Context } from "hono";
import { PrismaClient } from "@prisma/client";
import {
  RESPONSE_SUCCESS_MESSAGES,
  RESPONSE_ERROR_MESSAGES,
  STATUS_CODES,
} from "@/constants/index.js";
import { PaginationParams } from "@/types/index.js";
import { successResponse, errorResponse } from "@/utils/response.js";
import {
  CameraResponse,
  CreateCameraRequest,
  UpdateCameraRequest,
} from "@/dtos/camera.dto.js";
import { createCameraService } from "@/services/camera.service.js";
import { createWorkerService } from "@/services/worker.service.js";

export const createCameraController = (prisma: PrismaClient) => {
  const cameraService = createCameraService(prisma);
  const workerService = createWorkerService();

  const createCamera = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraData = c.get("validatedData") as CreateCameraRequest;

      const camera = await cameraService.createCamera(user.id, cameraData);

      return successResponse(
        c,
        STATUS_CODES.CREATED,
        RESPONSE_SUCCESS_MESSAGES.CAMERA_CREATED,
        "Camera created successfully",
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
        RESPONSE_SUCCESS_MESSAGES.CAMERAS_RETRIEVED,
        "Cameras retrieved successfully",
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

  const getCameraById = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      const camera = await cameraService.getCameraById(cameraId, user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_SUCCESS_MESSAGES.CAMERAS_RETRIEVED,
        "Camera retrieved successfully",
        camera
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
        RESPONSE_SUCCESS_MESSAGES.CAMERA_UPDATED,
        "Camera updated successfully",
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

  const deleteCamera = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      await workerService.stopStream(cameraId, {
        userId: user.id,
        role: user.role,
      });
      await cameraService.deleteCamera(cameraId, user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_SUCCESS_MESSAGES.CAMERA_DELETED,
        "Camera deleted successfully"
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.CAMERA_DELETE_FAILED,
        error
      );
    }
  };

  const startStream = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      const camera = (await cameraService.getCameraById(
        cameraId,
        user.id
      )) as CameraResponse;

      const result: any = await workerService.startStream(camera, {
        userId: user.id,
        role: user.role,
      });

      if (result.success) {
        return successResponse(
          c,
          STATUS_CODES.OK,
          RESPONSE_SUCCESS_MESSAGES.STREAM_STARTED,
          "Stream started successfully",
          result
        );
      } else {
        return errorResponse(
          c,
          STATUS_CODES.BAD_REQUEST,
          RESPONSE_ERROR_MESSAGES.STREAM_START_FAILED,
          result
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

  const stopStream = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      const camera = await cameraService.getCameraById(cameraId, user.id);
      if (!camera) {
        throw new Error(RESPONSE_ERROR_MESSAGES.CAMERA_NOT_FOUND);
      }

      const result = await workerService.stopStream(cameraId, {
        userId: user.id,
        role: user.role,
      });
      await cameraService.updateCameraStatus(cameraId, false, false);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_SUCCESS_MESSAGES.STREAM_STOPPED,
        "Stream stopped successfully",
        result
      );
    } catch (error) {
      return errorResponse(
        c,
        STATUS_CODES.BAD_REQUEST,
        RESPONSE_ERROR_MESSAGES.STREAM_STOP_FAILED,
        error
      );
    }
  };

  return {
    createCamera,
    getCameras,
    getCameraById,
    updateCamera,
    deleteCamera,
    startStream,
    stopStream,
  };
};
