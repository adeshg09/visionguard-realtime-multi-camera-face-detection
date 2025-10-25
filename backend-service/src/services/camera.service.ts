import { RESPONSE_ERROR_MESSAGES } from "@/constants/index.js";
import {
  CreateCameraRequest,
  CameraResponse,
  UpdateCameraRequest,
} from "@/dtos/camera.dto.js";
import { logger } from "@/libs/logger.lib.js";
import { PaginationParams, PaginatedResponse } from "@/types/index.js";
import { PrismaClient } from "@prisma/client";

export const createCameraService = (prisma: PrismaClient) => {
  const createCamera = async (
    userId: string,
    cameraData: CreateCameraRequest
  ): Promise<CameraResponse> => {
    try {
      const camera = await prisma.camera.create({
        data: {
          ...cameraData,
          userId,
        },
      });

      logger.info(`Camera ${camera.name} created for user ${userId}`);
      return camera;
    } catch (error) {
      logger.error("Create camera error:", error);
      throw error;
    }
  };

  const getCamerasByUserId = async (
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<CameraResponse>> => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = pagination;

      const [cameras, totalRecords] = await Promise.all([
        prisma.camera.findMany({
          where: { userId },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.camera.count({ where: { userId } }),
      ]);

      return {
        data: cameras,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
      };
    } catch (error) {
      logger.error("Get cameras error:", error);
      throw error;
    }
  };

  const getCameraById = async (
    id: string,
    userId: string
  ): Promise<CameraResponse | null> => {
    try {
      const camera = await prisma.camera.findFirst({
        where: { id, userId },
      });

      if (!camera) {
        throw new Error(RESPONSE_ERROR_MESSAGES.CAMERA_NOT_FOUND);
      }

      return camera;
    } catch (error) {
      logger.error("Get camera error:", error);
      throw error;
    }
  };

  const updateCamera = async (
    id: string,
    userId: string,
    updateData: UpdateCameraRequest
  ): Promise<CameraResponse> => {
    try {
      const camera = await prisma.camera.update({
        where: { id, userId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      logger.info(`Camera ${id} updated by user ${userId}`);
      return camera;
    } catch (error) {
      logger.error("Update camera error:", error);
      throw error;
    }
  };

  const deleteCamera = async (id: string, userId: string): Promise<void> => {
    try {
      await prisma.camera.delete({
        where: { id, userId },
      });

      logger.info(`Camera ${id} deleted by user ${userId}`);
    } catch (error) {
      logger.error("Delete camera error:", error);
      throw error;
    }
  };

  const updateCameraActiveStatus = async (id: string, isActive: boolean) => {
    try {
      const updatedCamera = await prisma.camera.update({
        where: { id },
        data: {
          isActive,
          updatedAt: new Date(),
        },
      });

      logger.info(`Camera ${id} active status updated: ${isActive}`);
      return updatedCamera;
    } catch (error) {
      logger.error("Update camera active status error:", error);
      throw error;
    }
  };

  const updateCameraOnlineStatus = async (id: string, isOnline: boolean) => {
    try {
      const updatedCamera = await prisma.camera.update({
        where: { id },
        data: {
          isOnline,
          ...(isOnline
            ? { lastOnlineAt: new Date() }
            : { lastOfflineAt: new Date() }),
          updatedAt: new Date(),
        },
      });

      logger.info(`Camera ${id} online status updated: ${isOnline}`);
      return updatedCamera;
    } catch (error) {
      logger.error("Update camera online status error:", error);
      throw error;
    }
  };

  

  return {
    createCamera,
    getCamerasByUserId,
    getCameraById,
    updateCamera,
    deleteCamera,
    updateCameraActiveStatus,
    updateCameraOnlineStatus,
  };
};
