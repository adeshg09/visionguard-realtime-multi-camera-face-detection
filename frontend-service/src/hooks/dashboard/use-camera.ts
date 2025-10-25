import Toast from "@/components/toast";
import {
  createCameraRequest,
  deleteCameraRequest,
  GetAllCamerasRequest,
  GetCameraByIdRequest,
  startCameraStreamRequest,
  stopCameraStreamRequest,
  toggleFaceDetectionRequest,
  updateCameraRequest,
  updateFpsRequest,
  type createCameraApiRequest,
  type toggleFaceDetectionApiRequest,
  type updateCameraApiRequest,
  type updateFpsApiRequest,
} from "@/services/admin-dashboard/cameras";
import { useMutation } from "@tanstack/react-query";

export const useCamera = (): any => {
  const createCameraMutation = useMutation({
    mutationFn: async ({
      name,
      rtspUrl,
      location,
      description,
      isActive,
    }: createCameraApiRequest) => {
      const response = await createCameraRequest({
        name,
        rtspUrl,
        location,
        description,
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

  const updateCameraMutation = useMutation({
    mutationFn: async ({
      cameraId,
      reqData,
    }: {
      cameraId: string;
      reqData: updateCameraApiRequest;
    }) => {
      const response = await updateCameraRequest(cameraId, reqData);
      console.log("update camera response", response);
      if (response.status.response_code === 200) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
      Toast.success({ message: "Success", description: response?.message });
    },
    onError: (error: any) => {
      console.log("update camera error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });

  const deleteCameraMutation = useMutation({
    mutationFn: async (cameraId: string) => {
      const response = await deleteCameraRequest(cameraId);
      console.log("delete camera response", response);
      if (response.status.response_code === 200) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
      Toast.success({ message: "Success", description: response?.message });
    },
    onError: (error: any) => {
      console.log("delete camera error", error?.response?.data?.message);
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
      console.log("get camera by id response", response);

      if (response.status.response_code === 200 && response?.data?.camera) {
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
        response?.data?.camera?.webrtcUrl
      ) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
      Toast.success({ message: "Success", description: response?.message });
    },
    onError: (error: any) => {
      console.log("start camera stream", error);
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

  const toggleFaceDetectionMutation = useMutation({
    mutationFn: async ({
      cameraId,
      reqData,
    }: {
      cameraId: string;
      reqData: toggleFaceDetectionApiRequest;
    }) => {
      const response = await toggleFaceDetectionRequest(cameraId, reqData);
      console.log("toggle face detection response", response);
      if (response.status.response_code === 200) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
      Toast.success({
        message: "Success",
        description: response?.message,
      });
    },
    onError: (error: any) => {
      console.log(
        "toggle face detection error",
        error?.response?.data?.message
      );
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });

  const updateFpsMutation = useMutation({
    mutationFn: async ({
      cameraId,
      reqData,
    }: {
      cameraId: string;
      reqData: updateFpsApiRequest;
    }) => {
      const response = await updateFpsRequest(cameraId, reqData);
      console.log("update FPS response", response);
      if (response.status.response_code === 200) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      console.log("data", response);
      Toast.success({
        message: "Success",
        description: response?.message,
      });
    },
    onError: (error: any) => {
      console.log("update FPS error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });

  return {
    createCameraMutation,
    updateCameraMutation,
    deleteCameraMutation,
    getAllCamerasMutation,
    getCameraByIdMutation,
    startCameraStreamMutation,
    stopCameraStreamMutation,
    toggleFaceDetectionMutation,
    updateFpsMutation,
  };
};
