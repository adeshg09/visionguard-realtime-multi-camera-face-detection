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
    const result = await makeWorkerRequest(`/cameras/start-stream`, {
      method: "POST",
      data: {
        cameraId: camera.id,
        rtspUrl: camera.rtspUrl,
        name: camera.name,
        fps: camera.fps,
      },
    });

    return result;
  };

  const stopStream = async (cameraId: string) => {
    return makeWorkerRequest("/cameras/stop-stream", {
      method: "POST",
      data: {
        cameraId,
      },
    });
  };

  const getStreamStatus = async (cameraId: string) => {
    return makeWorkerRequest(`/camera/${cameraId}/status`, {
      method: "GET",
    });
  };

  return {
    startStream,
    stopStream,
    getStreamStatus,
  };
};
