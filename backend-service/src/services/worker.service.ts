import { envConfig } from "@/config/env.config.js";
import { CameraResponse } from "@/dtos/camera.dto.js";
import { logger } from "@/libs/logger.lib.js";
import { createApiClient } from "@/libs/axios.lib.js";
import { WorkerRequestOptions } from "@/types/index.js";

export const createWorkerService = () => {
  const workerApiClient = createApiClient("worker");
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

  const stopStream = async (cameraId: string) => {
    const response = await makeWorkerRequest("/cameras/stop-stream", {
      method: "POST",
      data: {
        cameraId,
      },
    });

    return response;
  };

  const getStreamStatus = async (cameraId: string) => {
    const response = await makeWorkerRequest(`/camera/${cameraId}/status`, {
      method: "GET",
    });

    return response;
  };

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
