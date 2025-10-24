/* Imports */
import { useCallback, useEffect, useState, type JSX } from "react";
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
  const [loadingCameras, setLoadingCameras] = useState<Set<string>>(new Set());

  /* Functions */
  /**
   * Function to fetch all cameras from the backend.
   *
   * @returns {Promise<void>}
   */
  const handleGetCameras = useCallback(async (): Promise<void> => {
    const response = await getAllCamerasMutation.mutateAsync();
    setCameras(response.data.cameras);
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
      // Add this camera to loading state
      setLoadingCameras((prev) => new Set(prev).add(cameraId));

      const response = await startCameraStreamMutation.mutateAsync(cameraId);

      console.log("handleStartStream response", response);

      setCameras((prev) =>
        prev.map((cam) =>
          cam.id === cameraId
            ? {
                ...response.data.camera,
                streamUrls: response.data.streamUrls,
              }
            : cam
        )
      );
    } catch (error) {
      console.error("Failed to start stream:", error);
    } finally {
      // Remove this camera from loading state
      setLoadingCameras((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cameraId);
        return newSet;
      });
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
      // Add this camera to loading state
      setLoadingCameras((prev) => new Set(prev).add(cameraId));

      const response = await stopCameraStreamMutation.mutateAsync(cameraId);

      setCameras((prev) =>
        prev.map((cam) => (cam?.id === cameraId ? response.data.camera : cam))
      );
    } catch (error) {
      console.error("Failed to stop stream:", error);
    } finally {
      // Remove this camera from loading state
      setLoadingCameras((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cameraId);
        return newSet;
      });
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

  useEffect(() => {
    console.log("cameras", cameras);
  }, [cameras]);

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
          loadingCameras={loadingCameras}
        />
      )}
    </AdminDashboardPage>
  );
};

export default ManageCamera;
