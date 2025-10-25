/* Local Imports */
import axiosConfig from "@/lib/axios";
import { ADMIN_DASHBOARD_ENDPOINTS } from "../endpoints";
import type { ApiResponse } from "@/models";

// ----------------------------------------------------------------------

/* Interface */
export interface AlertsQueryParams {
  cameraId?: string;
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/* Function */
export const GetAlertsRequest = (
  params?: AlertsQueryParams
): Promise<ApiResponse> => {
  return axiosConfig
    .get(ADMIN_DASHBOARD_ENDPOINTS.ALERTS.GET_ALERTS, { params })
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Function */
export const GetAlertByIdRequest = (alertId: string): Promise<ApiResponse> => {
  return axiosConfig
    .get(
      ADMIN_DASHBOARD_ENDPOINTS.ALERTS.GET_ALERT_BY_ID.replace(":id", alertId)
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Function */
export const GetRecentAlertsByCameraRequest = (
  cameraId: string,
  limit: number = 10
): Promise<ApiResponse> => {
  return axiosConfig
    .get(
      ADMIN_DASHBOARD_ENDPOINTS.ALERTS.GET_RECENT_ALERTS_BY_CAMERA.replace(
        ":cameraId",
        cameraId
      ),
      { params: { limit } }
    )
    .then((response) => response.data);
};

// ----------------------------------------------------------------------

/* Function */
export const GetCameraAlertStatsRequest = (
  cameraId: string
): Promise<ApiResponse> => {
  return axiosConfig
    .get(
      ADMIN_DASHBOARD_ENDPOINTS.ALERTS.GET_CAMERA_ALERT_STATS.replace(
        ":cameraId",
        cameraId
      )
    )
    .then((response) => response.data);
};
