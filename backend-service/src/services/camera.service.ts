/* Relative Imports */
import { PrismaClient } from "@prisma/client";

/* Local Imports */
import { RESPONSE_ERROR_MESSAGES } from "@/constants/index.js";
import {
  CreateCameraRequest,
  CameraResponse,
  UpdateCameraRequest,
} from "@/dtos/camera.dto.js";
import { logger } from "@/libs/logger.lib.js";
import { PaginationParams, PaginatedResponse } from "@/types/index.js";

// ----------------------------------------------------------------------

/**
 * Service to handle all camera-related operations.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {object} - Camera service with all handlers
 */
export const createCameraService = (prisma: PrismaClient) => {
  /**
   * Creates a new camera for a user.
   *
   * @param {string} userId - User ID
   * @param {CreateCameraRequest} cameraData - Camera data to create
   * @returns {Promise<CameraResponse>} - Created camera response
   * @throws {Error} - If camera creation fails
   */
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

  /**
   * Retrieves a list of cameras for a given user.
   *
   * @param {string} userId - User ID
   * @param {PaginationParams} pagination - Pagination parameters
   * @returns {Promise<PaginatedResponse<CameraResponse>>} - Retrieved cameras response
   * @throws {Error} - If the cameras retrieval fails
   */
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

  /**
   * Retrieves a single camera by its ID.
   *
   * @param {string} id - Camera ID
   * @param {string} userId - User ID
   * @returns {Promise<CameraResponse | null>} - Retrieved camera response or null if not found
   * @throws {Error} - If the camera is not found
   */
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

  /**
   * Updates a camera with new data.
   *
   * @param {string} id - Camera ID
   * @param {string} userId - User ID
   * @param {UpdateCameraRequest} updateData - Camera data to update
   * @returns {Promise<CameraResponse>} - Updated camera response
   * @throws {Error} - If the camera is not found
   */
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

  /**
   * Deletes a camera.
   *
   * @param {string} id - Camera ID
   * @param {string} userId - User ID
   * @returns {Promise<void>} - Promise that resolves when the camera is deleted
   * @throws {Error} - If the camera is not found
   */
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

  /**
   * Updates a camera's active status.
   *
   * @param {string} id - Camera ID
   * @param {boolean} isActive - Camera active status
   * @returns {Promise<CameraResponse>} - Updated camera response
   * @throws {Error} - If the camera is not found
   */
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

  /**
   * Updates a camera's online status.
   *
   * @param {string} id - Camera ID
   * @param {boolean} isOnline - Camera online status
   * @returns {Promise<CameraResponse>} - Updated camera response
   * @throws {Error} - If the camera is not found
   */

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
