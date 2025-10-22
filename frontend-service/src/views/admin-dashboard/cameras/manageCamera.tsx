/* Imports */
import { useCallback, useEffect, useState, type JSX } from "react";

/* Relative Imports */
import { useNavigate } from "react-router-dom";

/* Local Imports */
import { PAGE_ADMIN_DASHBOARD } from "@/routes/paths";
import AdminDashboardPage from "@/components/page/adminDashboardPage";
import CameraGrid from "./components/cameraGrid";
import { useCamera } from "@/hooks/dashboard/use-camera";
import ButtonLoader from "@/components/loader/inlineLoader";

// ----------------------------------------------------------------------

/**
 * Component to create the manage camera page.
 *
 * @component
 * @returns {JSX.Element}
 */
const ManageCamera = (): JSX.Element => {
  /* Constants */
  const addCameraPath = PAGE_ADMIN_DASHBOARD.cameras.create.relativePath;
  const editCameraPath = PAGE_ADMIN_DASHBOARD.cameras.edit.relativePath;

  /* Hooks */
  const navigate = useNavigate();
  const {
    getAllCamerasMutation,
    startCameraStreamMutation,
    stopCameraStreamMutation,
  } = useCamera();

  /* States */
  const [cameras, setCameras] = useState<any[]>([]);

  /* Functions */
  /**
   * Function to fetch all cameras from the backend.
   *
   * @returns {Promise<void>}
   */
  const handleGetCameras = useCallback(async (): Promise<void> => {
    const response = await getAllCamerasMutation.mutateAsync();

    if (response?.status?.response_code === 200 && response.data?.cameras) {
      setCameras(response.data.cameras);
    }
  }, [getAllCamerasMutation]);

  /**
   * Function to navigate to add camera page.
   *
   * @returns {void}
   */
  const onAddButtonClick = (): void => {
    navigate(addCameraPath);
  };

  /**
   * Function to navigate to edit camera page.
   *
   * @param {any} camera - The camera object
   * @returns {void}
   */
  const handleEditCamera = (camera: any): void => {
    navigate(editCameraPath.replace(":id", camera.id));
  };

  /**
   * Function to start camera stream.
   *
   * @param {string} cameraId - The camera ID
   * @returns {Promise<void>}
   */
  const handleStartStream = async (cameraId: string): Promise<void> => {
    try {
      const response = await startCameraStreamMutation.mutateAsync(cameraId);

      if (response?.data?.webrtcUrl) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setCameras((prev) =>
          prev.map((cam) =>
            cam.id === cameraId
              ? {
                  ...cam,
                  webrtcUrl: response.data.webrtcUrl,
                }
              : cam
          )
        );
      }
    } catch (error) {
      console.error("Failed to start stream:", error);
    }
  };

  /**
   * Function to stop camera stream.
   *
   * @param {string} cameraId - The camera ID
   * @returns {Promise<void>}
   */
  const handleStopStream = async (cameraId: string): Promise<void> => {
    try {
      await stopCameraStreamMutation.mutateAsync(cameraId);

      setCameras((prev) =>
        prev.map((cam) =>
          cam.id === cameraId ? { ...cam, webrtcUrl: undefined } : cam
        )
      );
    } catch (error) {
      console.error("Failed to stop stream:", error);
    }
  };

  /**
   * Function to handle camera deletion.
   *
   * @param {string} cameraId - The camera ID
   * @returns {void}
   */
  const handleDeleteCamera = (cameraId: string): void => {
    // TODO: Implement delete functionality
    console.log("Delete camera:", cameraId);
  };

  /* Side-Effects */
  useEffect(() => {
    handleGetCameras();
  }, []);

  /* Output */
  return (
    <AdminDashboardPage
      title="Manage Cameras"
      addButtonTitle="Camera"
      onAddButtonClick={onAddButtonClick}
    >
      {getAllCamerasMutation.isPending ? (
        <div className="flex items-center justify-center h-[calc(100vh-200px)] gap-2">
          <ButtonLoader />
          <p className="text-muted-foreground">Loading cameras...</p>
        </div>
      ) : (
        <CameraGrid
          cameras={cameras}
          onEditCamera={handleEditCamera}
          onDeleteCamera={handleDeleteCamera}
          onStartStream={handleStartStream}
          onStopStream={handleStopStream}
          isStartingStream={startCameraStreamMutation.isPending}
          isStoppingStream={stopCameraStreamMutation.isPending}
        />
      )}
    </AdminDashboardPage>
  );
};

export default ManageCamera;
