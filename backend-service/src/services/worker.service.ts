/* Local Imports */
import { envConfig } from "@/config/env.config.js";
import { CameraResponse } from "@/dtos/camera.dto.js";
import { logger } from "@/libs/logger.lib.js";
import { createApiClient } from "@/libs/axios.lib.js";
import { WorkerRequestOptions } from "@/types/index.js";

// ----------------------------------------------------------------------

/**
 * Service to handle all worker-related operations.
 *
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {object} - Worker service with all handlers
 */

export const createWorkerService = () => {
  const workerApiClient = createApiClient("worker");

  /**
   * Makes a request to the worker service.
   *
   * @param {string} endpoint - The endpoint to request.
   * @param {WorkerRequestOptions} options - The options for the request.
   * @returns {Promise<CameraResponse>} - A promise that resolves to the response data.
   */
  const makeWorkerRequest = async (
    endpoint: string,
    options: WorkerRequestOptions = {}
  ) => {
    try {
      logger.info(`Worker service request: ${endpoint} with options:`, options);
      const config = {
        url: endpoint,
        method: options.method || "GET",
        data: options.data,
        headers: {
          "X-Backend-Worker-API-Key": envConfig.BACKEND_WORKER_API_KEY,
          ...options.headers,
        },
      };
      const response = await workerApiClient(config);
      logger.info(`Worker service response:`, response.data);

      return response.data;
    } catch (error) {
      logger.error("Worker service request failed:", error);
      throw error;
    }
  };

  /**
   * Starts a live camera stream.
   *
   * @param {CameraResponse} camera - The camera to start the stream for.
   * @returns {Promise<CameraResponse>} - A promise that resolves to the response data.
   */
  const startStream = async (camera: CameraResponse) => {
    const response = await makeWorkerRequest(`/cameras/start-stream`, {
      method: "POST",
      data: {
        cameraId: camera.id,
        name: camera.name,
        rtspUrl: camera.rtspUrl,
        location: camera.location,
        faceDetectionEnabled: camera.faceDetectionEnabled,
      },
    });

    return response;
  };

  /**
   * Stops a live camera stream.
   *
   * @param {string} cameraId - The ID of the camera to stop the stream for.
   * @returns {Promise<ApiResponse>} - A promise that resolves to the response data.
   */
  const stopStream = async (cameraId: string) => {
    const response = await makeWorkerRequest("/cameras/stop-stream", {
      method: "POST",
      data: {
        cameraId,
      },
    });

    return response;
  };

  /**
   * Retrieves the current status of a live camera stream.
   *
   * @param {string} cameraId - The ID of the camera to retrieve the status for.
   * @returns {Promise<ApiResponse>} - A promise that resolves to the response data.
   */
  const getStreamStatus = async (cameraId: string) => {
    const response = await makeWorkerRequest(`/camera/${cameraId}/status`, {
      method: "GET",
    });

    return response;
  };

  /**
   * Toggles face detection for a live camera stream.
   *
   * @param {string} cameraId - The ID of the camera to toggle face detection for.
   * @param {boolean} enabled - Whether to enable or disable face detection.
   * @returns {Promise<ApiResponse>} - A promise that resolves to the response data.
   */
  const toggleFaceDetection = async (cameraId: string, enabled: boolean) => {
    const response = await makeWorkerRequest(
      `/cameras/${cameraId}/toggle-face-detection`,
      {
        method: "POST",
        data: {
          enabled,
        },
      }
    );

    return response;
  };

  /**
   * Updates the target FPS for a live camera stream.
   *
   * @param {string} cameraId - The ID of the camera to update the target FPS for.
   * @param {number} targetFPS - The new target FPS to set for the camera stream.
   * @returns {Promise<ApiResponse>} - A promise that resolves to the response data.
   */
  const updateFps = async (cameraId: string, targetFPS: number) => {
    const response = await makeWorkerRequest(
      `/cameras/${cameraId}/update-fps`,
      {
        method: "POST",
        data: {
          targetFPS,
        },
      }
    );

    return response;
  };

  return {
    startStream,
    stopStream,
    getStreamStatus,
    toggleFaceDetection,
    updateFps,
  };
};
