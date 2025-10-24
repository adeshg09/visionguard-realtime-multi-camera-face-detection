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
  location: string;
  description: string;
  resolution: string;
  fps: number;
  isActive: boolean;
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
  name: string;
  rtspUrl: string;
  location: string;
  description: string;
  resolution: string;
  fps: number;
  isActive: boolean;
}

/* Function */
export const updateCameraRequest = (
  cameraId: string,
  reqData: updateCameraApiRequest
): Promise<ApiResponse> => {
  return axiosConfig
    .put(
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
