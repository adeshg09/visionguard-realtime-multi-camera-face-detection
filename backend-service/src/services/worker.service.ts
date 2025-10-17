import { envConfig } from "@/config/env.config.js";
import { CameraResponse } from "@/dtos/camera.dto.js";
import { logger } from "@/libs/logger.lib.js";
import { createApiClient } from "@/libs/axios.lib.js";

export const createWorkerService = () => {
  const workerApiClient = createApiClient("worker");
  const makeWorkerRequest = async (
    endpoint: string,
    userContext: { userId: string; role: string },
    options: RequestInit = {}
  ) => {
    try {
      logger.info(`Worker service request: ${endpoint} with options:`, options);
      const config = {
        url: endpoint,
        method: options.method || "GET",
        data: options.body,
        headers: {
          "X-Backend-Worker-API-Key": envConfig.BACKEND_WORKER_API_KEY,
          "X-User-Id": userContext.userId,
          "X-User-Role": userContext.role,
          ...options.headers,
        },
      };
      const response = await workerApiClient(config);

      logger.info(`Worker service response:`, response);

      return response.data;
    } catch (error) {
      logger.error("Worker service request failed:", error);
      throw error;
    }
  };

  const startStream = async (
    camera: CameraResponse,
    userContext: { userId: string; role: string }
  ) => {
    return makeWorkerRequest("/camera/start", userContext, {
      method: "POST",
      body: JSON.stringify({
        cameraId: camera.id,
        rtspUrl: camera.rtspUrl,
        name: camera.name,
      }),
    });
  };

  const stopStream = async (
    cameraId: string,
    userContext: { userId: string; role: string }
  ) => {
    return makeWorkerRequest("/camera/stop", userContext, {
      method: "POST",
      body: JSON.stringify({ cameraId }),
    });
  };

  const getStreamStatus = async (
    cameraId: string,
    userContext: { userId: string; role: string }
  ) => {
    return makeWorkerRequest(`/camera/${cameraId}/status`, userContext, {
      method: "GET",
    });
  };

  return {
    startStream,
    stopStream,
    getStreamStatus,
  };
};
