import { Toast } from "@/components/toast";
import {
  createCameraRequest,
  GetAllCamerasRequest,
  GetCameraByIdRequest,
  startCameraStreamRequest,
  stopCameraStreamRequest,
  type createCameraApiRequest,
} from "@/services/admin-dashboard/cameras";
import { useMutation } from "@tanstack/react-query";

export const useCamera = (): any => {
  const createCameraMutation = useMutation({
    mutationFn: async ({
      name,
      rtspUrl,
      location,
      description,
      resolution,
      fps,
      isActive,
    }: createCameraApiRequest) => {
      const response = await createCameraRequest({
        name,
        rtspUrl,
        location,
        description,
        resolution,
        fps,
        isActive,
      });
      console.log("create camera response", response);
      if (response.status.response_code === 201) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
      Toast.success({ message: "Success", description: response?.message });
    },
    onError: (error: any) => {
      console.log("create camera error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });

  const getAllCamerasMutation = useMutation({
    mutationFn: async () => {
      const response = await GetAllCamerasRequest();

      if (response.status.response_code === 200 && response?.data?.cameras) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
    },
    onError: (error: any) => {
      console.log("Get all  cameras error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });

  const getCameraByIdMutation = useMutation({
    mutationFn: async (cameraId: string) => {
      const response = await GetCameraByIdRequest(cameraId);

      if (response.status.response_code === 200) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
    },
    onError: (error: any) => {
      console.log("Get camera by id error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });

  const startCameraStreamMutation = useMutation({
    mutationFn: async (cameraId: string) => {
      const response = await startCameraStreamRequest(cameraId);
      console.log("start camera stream response", response);
      if (
        response?.status?.response_code === 200 &&
        response?.data?.streamUrls?.webrtcUrl
      ) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
      Toast.success({ message: "Success", description: response?.message });
    },
    onError: (error: any) => {
      console.log("start camera stream error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });

  const stopCameraStreamMutation = useMutation({
    mutationFn: async (cameraId: string) => {
      const response = await stopCameraStreamRequest(cameraId);
      console.log("stop camera stream response", response);
      if (response?.status?.response_code === 200) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      Toast.success({ message: "Success", description: response?.message });
    },
    onError: (error: any) => {
      console.log("stop camera stream error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });

  return {
    createCameraMutation,
    getAllCamerasMutation,
    getCameraByIdMutation,
    startCameraStreamMutation,
    stopCameraStreamMutation,
  };
};
