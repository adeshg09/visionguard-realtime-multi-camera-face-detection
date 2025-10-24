/* Local Imports */
import axiosConfig from "@/lib/axios";
import { ADMIN_DASHBOARD_ENDPOINTS } from "../endpoints";
import type { ApiResponse } from "@/models";

// ----------------------------------------------------------------------

/* Interface */

/* Function */
export const GetAllCamerasRequest = (): Promise<ApiResponse> => {
  return axiosConfig
    .get(ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.GET_CAMERAS)
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */

/* Function */
export const GetCameraByIdRequest = (
  cameraId: string
): Promise<ApiResponse> => {
  return axiosConfig
    .get(
      ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.GET_CAMERA_BY_ID.replace(
        ":cameraId",
        cameraId
      )
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */
export interface createCameraApiRequest {
  name: string;
  rtspUrl: string;
  location?: string;
  description?: string;
  resolution?: string;
  fps?: number;
  isActive?: boolean;
}

/* Function */
export const createCameraRequest = (
  reqData: createCameraApiRequest
): Promise<ApiResponse> => {
  return axiosConfig
    .post(ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.CREATE_CAMERA, reqData)
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */
export interface updateCameraApiRequest {
  name?: string;
  rtspUrl?: string;
  location?: string;
  description?: string;
  resolution?: string;
  fps?: number;
  isActive?: boolean;
}

/* Function */
export const updateCameraRequest = (
  cameraId: string,
  reqData: updateCameraApiRequest
): Promise<ApiResponse> => {
  return axiosConfig
    .patch(
      ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.UPDATE_CAMERA.replace(
        ":cameraId",
        cameraId
      ),
      reqData
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */

/* Function */
export const deleteCameraRequest = (cameraId: string): Promise<ApiResponse> => {
  return axiosConfig
    .delete(
      ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.DELETE_CAMERA.replace(
        ":cameraId",
        cameraId
      )
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */

/* Function */
export const startCameraStreamRequest = (
  cameraId: string
): Promise<ApiResponse> => {
  return axiosConfig
    .post(
      ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.START_CAMERA_STREAM.replace(
        ":cameraId",
        cameraId
      )
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */

/* Function */
export const stopCameraStreamRequest = (
  cameraId: string
): Promise<ApiResponse> => {
  return axiosConfig
    .post(
      ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.STOP_CAMERA_STREAM.replace(
        ":cameraId",
        cameraId
      )
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */

/* Function */
export const getStreamStatusRequest = (
  cameraId: string
): Promise<ApiResponse> => {
  return axiosConfig
    .get(
      ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.GET_STREAM_STATUS.replace(
        ":cameraId",
        cameraId
      )
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */
export interface toggleFaceDetectionApiRequest {
  enabled: boolean;
}

/* Function */
export const toggleFaceDetectionRequest = (
  cameraId: string,
  reqData: toggleFaceDetectionApiRequest
): Promise<ApiResponse> => {
  return axiosConfig
    .post(
      ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.TOGGLE_FACE_DETECTION.replace(
        ":cameraId",
        cameraId
      ),
      reqData
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Interface */
export interface updateFrameSkipIntervalApiRequest {
  frameSkipInterval: number;
}

/* Function */
export const updateFrameSkipIntervalRequest = (
  cameraId: string,
  reqData: updateFrameSkipIntervalApiRequest
): Promise<ApiResponse> => {
  return axiosConfig
    .post(
      ADMIN_DASHBOARD_ENDPOINTS.CAMERAS.UPDATE_FRAME_SKIP_INTERVAL.replace(
        ":cameraId",
        cameraId
      ),
      reqData
    )
    .then((response) => response.data);
};
