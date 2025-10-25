/* Imports */
import { type JSX } from "react";

/* Local Imports */
import { useAlert } from "@/hooks/dashboard/use-alert";
import SnapshotPreviewDialog from "../dialogs/snapshot-preview-dialog";
import AlertHistoryDialog from "../dialogs/alert-history-dialog";
import LiveAlertsDialog from "../dialogs/live-alerts-dialog";

// ----------------------------------------------------------------------

/* Interface */
interface CameraDialogsProps {
  camera: any;
  liveAlerts: any[];
  snapshotPreviewUrl: string | null;
  showSnapshotDialog: boolean;
  showHistoryDialog: boolean;
  showLiveAlertsDialog: boolean;
  onSnapshotDialogChange: (open: boolean) => void;
  onHistoryDialogChange: (open: boolean) => void;
  onLiveAlertsDialogChange: (open: boolean) => void;
  onSnapshotClick: (url: string) => void;
}

// ----------------------------------------------------------------------

/**
 * Component to manage all camera-related dialogs.
 */
const CameraDialogs = ({
  camera,
  liveAlerts,
  snapshotPreviewUrl,
  showSnapshotDialog,
  showHistoryDialog,
  showLiveAlertsDialog,
  onSnapshotDialogChange,
  onHistoryDialogChange,
  onLiveAlertsDialogChange,
  onSnapshotClick,
}: CameraDialogsProps): JSX.Element => {
  /* Hooks */
  const { getAlertsMutation } = useAlert();

  /* Functions */
  const fetchAlertHistory = async (cameraId: string, page: number) => {
    const response = await getAlertsMutation.mutateAsync({
      cameraId,
      page,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    return response;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  /* Output */
  return (
    <>
      <SnapshotPreviewDialog
        open={showSnapshotDialog}
        onOpenChange={onSnapshotDialogChange}
        snapshotUrl={snapshotPreviewUrl}
      />

      <AlertHistoryDialog
        open={showHistoryDialog}
        onOpenChange={onHistoryDialogChange}
        cameraId={camera.id}
        cameraName={camera.name}
        onSnapshotClick={onSnapshotClick}
        fetchAlerts={fetchAlertHistory}
      />

      <LiveAlertsDialog
        open={showLiveAlertsDialog}
        onOpenChange={onLiveAlertsDialogChange}
        cameraName={camera.name}
        liveAlerts={liveAlerts}
        onSnapshotClick={onSnapshotClick}
        formatTimestamp={formatTimestamp}
      />
    </>
  );
};

export default CameraDialogs;
