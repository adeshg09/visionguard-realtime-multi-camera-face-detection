import type { Context } from "hono";
import { PrismaClient } from "@prisma/client";
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

  const getCameraById = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      const camera = await cameraService.getCameraById(cameraId, user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.CAMERAS_RETRIEVED,
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

  const deleteCamera = async (c: Context) => {
    try {
      const user = c.get("user");
      const cameraId = c.req.param("id");

      await workerService.stopStream(cameraId);
      await cameraService.deleteCamera(cameraId, user.id);

      return successResponse(
        c,
        STATUS_CODES.OK,
        RESPONSE_MESSAGES.SUCCESS,
        RESPONSE_SUCCESS_MESSAGES.CAMERA_DELETED
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

      const result: any = await workerService.startStream(camera);

      if (result.status.response_code === 200) {
        const updatedCamera = await cameraService.updateCameraOnlineStatus(
          cameraId,
          true
        );

        return successResponse(
          c,
          STATUS_CODES.OK,
          RESPONSE_MESSAGES.SUCCESS,
          result.message,
          {
            camera: {
              ...updatedCamera,
            },
            streamUrls: {
              webrtcUrl: result.data?.webrtcUrl,
              hlsUrl: result.data?.hlsUrl,
              rtspUrl: result.data?.rtspUrl,
              rtmpUrl: result.data?.rtmpUrl,
            },
          } as StartStreamResponse
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

      const result = await workerService.stopStream(cameraId);

      if (result.status.response_code === 200) {
        const updatedCamera = await cameraService.updateCameraOnlineStatus(
          cameraId,
          false
        );

        return successResponse(
          c,
          STATUS_CODES.OK,
          RESPONSE_MESSAGES.SUCCESS,
          RESPONSE_SUCCESS_MESSAGES.STREAM_STOPPED,
          {
            camera: {
              ...updatedCamera,
            },
          }
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

  return {
    createCamera,
    getCameras,
    getCameraById,
    updateCamera,
    deleteCamera,
    startStream,
    stopStream,
    getStreamStatus,
  };
};
