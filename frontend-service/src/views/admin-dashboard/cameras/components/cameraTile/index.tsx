/* Imports */
import { type JSX, useState, useEffect, useCallback } from "react";

/* Local Imports */
import { Card } from "@/components/ui/card";
import { useAppSelector, useAppDispatch } from "@/hooks/use-store";
import { useCamera } from "@/hooks/dashboard/use-camera";
import { useWebSocket } from "@/hooks/use-websocket";
import type { AlertNotification } from "@/models";
// import Toast from "@/components/toast";
import CameraHeader from "./camera-header";
import CameraStatusBadges from "./camera-status-badges";
import CameraVideoStream from "./camera-video-stream";
import CameraLiveAlerts from "./camera-live-alerts";
import CameraActions from "./camera-actions";
import CameraDialogs from "./camera-dialogs";
import { cameraSliceActions } from "@/store/cameraSlice";

// ----------------------------------------------------------------------

/* Interface */
interface CameraTileProps {
  camera: any;
  onEdit: (camera: any) => void;
  onDelete: (cameraId: string) => void;
  onStartStream: (cameraId: string) => void;
  onStopStream: (cameraId: string) => void;
}

// ----------------------------------------------------------------------

/**
 * Component to display individual camera tile with video stream and alerts.
 */
const CameraTile = ({
  camera,
  onEdit,
  onDelete,
  onStartStream,
  onStopStream,
}: CameraTileProps): JSX.Element => {
  /* States */
  const [isHovered, setIsHovered] = useState(false);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showLiveAlertsDialog, setShowLiveAlertsDialog] = useState(false);
  const [snapshotPreviewUrl, setSnapshotPreviewUrl] = useState<string | null>(
    null
  );

  /* Redux */
  const dispatch = useAppDispatch();
  const loadingCameras = useAppSelector((state) => state.camera.loadingCameras);
  const liveAlerts = useAppSelector(
    (state) => state.camera.liveAlerts[camera.id] || []
  );
  const todayAlertsCount = useAppSelector(
    (state) => state.camera.todayAlertsCounts[camera.id] || 0
  );

  /* Hooks */
  const { toggleFaceDetectionMutation, updateFpsMutation } = useCamera();
  const { onMessage, subscribeToCamera, unsubscribeFromCamera } =
    useWebSocket();

  /* Constants */
  const isLoading = loadingCameras.includes(camera.id);
  const isStreaming = camera.isOnline;
  const isActive = camera.isActive;

  /* Functions */
  const handleSnapshotClick = (url: string) => {
    setSnapshotPreviewUrl(url);
    setShowSnapshotDialog(true);
  };

  const handleToggleFaceDetection = async (enabled: boolean): Promise<void> => {
    await toggleFaceDetectionMutation.mutateAsync({
      cameraId: camera.id,
      reqData: { enabled },
    });
    dispatch(
      cameraSliceActions.updateCamera({
        ...camera,
        faceDetectionEnabled: enabled,
      })
    );
  };

  const handleUpdateFPS = async (fps: number): Promise<void> => {
    await updateFpsMutation.mutateAsync({
      cameraId: camera.id,
      reqData: { targetFPS: fps },
    });
    dispatch(
      cameraSliceActions.updateCamera({
        ...camera,
        targetFPS: fps,
      })
    );
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback(
    (message: any) => {
      if (message.type === "ALERT_CREATED") {
        const alertData = message as AlertNotification;

        if (alertData.data.cameraId === camera.id) {
          const newAlert = {
            id: alertData.data.id,
            cameraId: alertData.data.cameraId,
            faceCount: alertData.data.faceCount,
            confidence: alertData.data.confidence,
            snapshotUrl: alertData.data.snapshotUrl,
            createdAt: alertData.data.timestamp,
          };

          dispatch(
            cameraSliceActions.addLiveAlert({
              cameraId: camera.id,
              alert: newAlert,
            })
          );
          dispatch(cameraSliceActions.incrementTodayAlertsCount(camera.id));

          // Toast.info({
          //   message: `New Alert - ${alertData.data.cameraName}`,
          //   description: `${alertData.data.faceCount} face(s) detected`,
          // });
        }
      }
    },
    [camera.id, dispatch]
  );

  /* Side Effects */
  useEffect(() => {
    subscribeToCamera(camera.id);
    const unsubscribe = onMessage(handleWebSocketMessage);

    return () => {
      unsubscribeFromCamera(camera.id);
      unsubscribe();
    };
  }, [
    camera.id,
    subscribeToCamera,
    unsubscribeFromCamera,
    onMessage,
    handleWebSocketMessage,
  ]);

  /* Output */
  return (
    <>
      <Card
        className="flex flex-col h-full w-full overflow-hidden transition-all duration-300 hover:shadow-xl border border-border/50 bg-card p-0 gap-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CameraHeader camera={camera} isActive={isActive} />

        <CameraStatusBadges
          camera={camera}
          isStreaming={isStreaming}
          isActive={isActive}
        />

        <CameraVideoStream
          camera={camera}
          isStreaming={isStreaming}
          isActive={isActive}
          isLoading={isLoading}
          isHovered={isHovered}
        />

        <CameraLiveAlerts
          cameraId={camera.id}
          alerts={liveAlerts}
          todayAlertsCount={todayAlertsCount}
          onSnapshotClick={handleSnapshotClick}
          onViewHistory={() => setShowHistoryDialog(true)}
          onViewAllLive={() => setShowLiveAlertsDialog(true)}
        />

        <CameraActions
          camera={camera}
          isStreaming={isStreaming}
          isActive={isActive}
          isLoading={isLoading}
          onEdit={onEdit}
          onDelete={onDelete}
          onStartStream={onStartStream}
          onStopStream={onStopStream}
          onToggleFaceDetection={handleToggleFaceDetection}
          onUpdateFPS={handleUpdateFPS}
        />
      </Card>

      <CameraDialogs
        camera={camera}
        liveAlerts={liveAlerts}
        snapshotPreviewUrl={snapshotPreviewUrl}
        showSnapshotDialog={showSnapshotDialog}
        showHistoryDialog={showHistoryDialog}
        showLiveAlertsDialog={showLiveAlertsDialog}
        onSnapshotDialogChange={setShowSnapshotDialog}
        onHistoryDialogChange={setShowHistoryDialog}
        onLiveAlertsDialogChange={setShowLiveAlertsDialog}
        onSnapshotClick={handleSnapshotClick}
      />
    </>
  );
};

export default CameraTile;
