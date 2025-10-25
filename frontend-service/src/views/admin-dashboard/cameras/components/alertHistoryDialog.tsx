/* Imports */
import { type JSX, useState, useEffect } from "react";
import {
  X,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import ButtonLoader from "@/components/loader/inlineLoader";

// ----------------------------------------------------------------------

/* Interface */
interface AlertHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraId: string;
  cameraName: string;
  onSnapshotClick: (snapshotUrl: string) => void;
  fetchAlerts: (cameraId: string, page: number) => Promise<any>;
}

// ----------------------------------------------------------------------

/**
 * Component to display camera alert history grouped by date with pagination.
 */
const AlertHistoryDialog = ({
  open,
  onOpenChange,
  cameraId,
  cameraName,
  onSnapshotClick,
  fetchAlerts,
}: AlertHistoryDialogProps): JSX.Element => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    if (open && cameraId) {
      loadAlerts(currentPage);
    }
  }, [open, cameraId, currentPage]);

  const loadAlerts = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await fetchAlerts(cameraId, page);
      console.log("load alerts res", response);
      setAlerts(response.data.alerts || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalRecords(response.data.pagination?.totalRecords || 0);
    } catch (error) {
      console.error("Failed to load alert history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Group alerts by date
  const groupAlertsByDate = (alerts: any[]) => {
    const grouped: { [key: string]: any[] } = {};

    alerts?.forEach((alert) => {
      const date = new Date(alert.createdAt);
      const dateKey = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(alert);
    });

    return grouped;
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const groupedAlerts = groupAlertsByDate(alerts);
  const dateKeys = Object.keys(groupedAlerts);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Detection History</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {cameraName} • {totalRecords} total detections
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <ButtonLoader />
              <p className="text-muted-foreground ml-2">
                Loading detections...
              </p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                No Detections Found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No face detection alerts have been recorded for this camera yet.
                Start the stream to begin monitoring.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {dateKeys.map((dateKey) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-10 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">{dateKey}</h3>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {groupedAlerts[dateKey].length} detection
                        {groupedAlerts[dateKey].length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <Separator className="mt-3" />
                  </div>

                  {/* Alerts for this date */}
                  <div className="space-y-3 mt-3">
                    {groupedAlerts[dateKey].map((alert: any) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-all duration-200 hover:shadow-sm"
                      >
                        {/* Snapshot */}
                        {alert.snapshotUrl && (
                          <img
                            src={alert.snapshotUrl}
                            alt="Alert snapshot"
                            className="w-24 h-24 rounded-lg object-cover border border-border cursor-pointer hover:ring-2 hover:ring-primary transition-all shrink-0"
                            onClick={() => onSnapshotClick(alert.snapshotUrl)}
                          />
                        )}

                        {/* Alert Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold text-base">
                                {alert.faceCount}{" "}
                                {alert.faceCount === 1 ? "Face" : "Faces"}{" "}
                                Detected
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {formatTime(alert.createdAt)}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-medium",
                                alert.confidence >= 0.9
                                  ? "bg-green-500/10 text-green-700 border-green-500/30"
                                  : alert.confidence >= 0.7
                                  ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                                  : "bg-red-500/10 text-red-700 border-red-500/30"
                              )}
                            >
                              {(alert.confidence * 100).toFixed(0)}% Confidence
                            </Badge>
                          </div>

                          {alert.camera && alert.camera.location && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Eye className="w-3.5 h-3.5" />
                              <span>{alert.camera.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && alerts.length > 0 && (
          <div className="border-t p-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <Separator orientation="vertical" className="h-4" />
                <p className="text-sm text-muted-foreground">
                  Showing {alerts.length} of {totalRecords} detections
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AlertHistoryDialog;
