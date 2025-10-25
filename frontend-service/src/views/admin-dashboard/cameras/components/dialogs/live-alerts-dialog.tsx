/* Imports */
import { type JSX, useState } from "react";
import { X, Zap, ChevronLeft, ChevronRight } from "lucide-react";

/* Local Imports */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AlertThumbnail from "../shared/alert-thumbnail";

// ----------------------------------------------------------------------

/* Interface */
interface LiveAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraName: string;
  liveAlerts: any[];
  onSnapshotClick: (snapshotUrl: string) => void;
  formatTimestamp: (timestamp: string) => string;
}

// ----------------------------------------------------------------------

/**
 * Component to display all live alerts in a paginated dialog.
 */
const LiveAlertsDialog = ({
  open,
  onOpenChange,
  cameraName,
  liveAlerts,
  onSnapshotClick,
  formatTimestamp,
}: LiveAlertsDialogProps): JSX.Element => {
  /* Constants */
  const itemsPerPage = 15;

  /* States */
  const [currentPage, setCurrentPage] = useState(1);

  /* Derived Values */
  const totalPages = Math.ceil(liveAlerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAlerts = liveAlerts.slice(startIndex, endIndex);

  /* Functions */
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  /* Output */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-xl">Live Alerts</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {cameraName} • {liveAlerts.length} recent detections
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
        <div className="flex-1 overflow-y-auto p-6">
          {currentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Live Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Waiting for face detection alerts...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentAlerts.map((alert: any) => (
                <AlertThumbnail
                  key={alert.id}
                  alert={alert}
                  onSnapshotClick={onSnapshotClick}
                  formatTimestamp={formatTimestamp}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {currentAlerts.length > 0 && totalPages > 1 && (
          <div className="border-t p-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} • Showing{" "}
                {currentAlerts.length} of {liveAlerts.length}
              </p>

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

export default LiveAlertsDialog;
