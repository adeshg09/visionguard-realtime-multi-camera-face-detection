import Toast from "@/components/toast";
import {
  GetAlertsRequest,
  GetAlertByIdRequest,
  GetRecentAlertsByCameraRequest,
  GetCameraAlertStatsRequest,
  type AlertsQueryParams,
} from "@/services/admin-dashboard/alerts";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useAlert = () => {
  // Get all alerts with filters
  const getAlertsMutation = useMutation({
    mutationFn: async (params?: AlertsQueryParams) => {
      const response = await GetAlertsRequest(params);
      if (response.status.response_code === 200) {
        return response;
      }
    },
    onError: (error: any) => {
      console.log("Get alerts error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message || "Failed to fetch alerts",
      });
    },
  });

  // Get single alert by ID
  const getAlertByIdMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await GetAlertByIdRequest(alertId);
      if (response.status.response_code === 200) {
        return response;
      }
    },
    onError: (error: any) => {
      console.log("Get alert by ID error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message || "Failed to fetch alert",
      });
    },
  });

  const useRecentAlertsQuery = (cameraId: string, limit: number = 5) => {
    return useQuery({
      queryKey: ["recent-alerts", cameraId],
      queryFn: async () => {
        const response = await GetRecentAlertsByCameraRequest(cameraId, limit);
        if (response.status.response_code === 200) {
          return response.data;
        }
        return [];
      },
      enabled: !!cameraId,
      staleTime: Infinity,
    });
  };

  const useCameraAlertStatsQuery = (cameraId: string) => {
    return useQuery({
      queryKey: ["camera-alert-stats", cameraId],
      queryFn: async () => {
        const response = await GetCameraAlertStatsRequest(cameraId);
        if (response.status.response_code === 200) {
          return response.data;
        }
        return null;
      },
      enabled: !!cameraId,
      staleTime: Infinity,
    });
  };

  return {
    getAlertsMutation,
    getAlertByIdMutation,
    useRecentAlertsQuery,
    useCameraAlertStatsQuery,
  };
};
