/* Imports */
import { useCallback, useEffect, type JSX } from "react";
import { useNavigate } from "react-router-dom";

/* Local Imports */
import { PAGE_ADMIN_DASHBOARD } from "@/routes/paths";
import AdminDashboardPage from "@/components/page/adminDashboardPage";
import CameraGrid from "./components/cameraGrid";
import { useCamera } from "@/hooks/dashboard/use-camera";
import { useAppSelector, useAppDispatch } from "@/hooks/use-store";
import ButtonLoader from "@/components/loader/inlineLoader";
import { cameraSliceActions } from "@/store/cameraSlice";

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
  const dispatch = useAppDispatch();
  const {
    getAllCamerasMutation,
    startCameraStreamMutation,
    stopCameraStreamMutation,
    deleteCameraMutation,
  } = useCamera();

  /* Redux State */
  const cameras = useAppSelector((state) => state.camera.cameras);

  /* Functions */
  /**
   * Function to fetch all cameras from the backend.
   *
   * @returns {Promise<void>}
   */
  const handleGetCameras = useCallback(async (): Promise<void> => {
    const response = await getAllCamerasMutation.mutateAsync();
    dispatch(cameraSliceActions.setCameras(response.data.cameras));
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
      dispatch(cameraSliceActions.addLoadingCamera(cameraId));

      const response = await startCameraStreamMutation.mutateAsync(cameraId);

      dispatch(cameraSliceActions.updateCamera(response.data.camera));
    } catch (error) {
      console.error("Failed to start stream:", error);
    } finally {
      dispatch(cameraSliceActions.removeLoadingCamera(cameraId));
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
      dispatch(cameraSliceActions.addLoadingCamera(cameraId));

      const response = await stopCameraStreamMutation.mutateAsync(cameraId);

      dispatch(cameraSliceActions.updateCamera(response.data.camera));
    } catch (error) {
      console.error("Failed to stop stream:", error);
    } finally {
      dispatch(cameraSliceActions.removeLoadingCamera(cameraId));
    }
  };

  /**
   * Function to handle camera deletion.
   *
   * @param {string} cameraId - The camera ID
   * @returns {Promise<void>}
   */
  const handleDeleteCamera = async (cameraId: string): Promise<void> => {
    try {
      await deleteCameraMutation.mutateAsync(cameraId);
      dispatch(cameraSliceActions.removeCamera(cameraId));
    } catch (error) {
      console.error("Failed to delete camera:", error);
    }
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
        />
      )}
    </AdminDashboardPage>
  );
};

export default ManageCamera;
