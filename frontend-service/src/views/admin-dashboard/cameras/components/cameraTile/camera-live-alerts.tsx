/* Imports */
import { type JSX, useRef, useEffect } from "react";
import { AlertTriangle, MoreVertical, History } from "lucide-react";

/* Local Imports */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AlertThumbnail from "../shared/alert-thumbnail";

// ----------------------------------------------------------------------

/* Interface */
interface CameraLiveAlertsProps {
  cameraId: string;
  alerts: any[];
  todayAlertsCount: number;
  onSnapshotClick: (snapshotUrl: string) => void;
  onViewHistory: () => void;
  onViewAllLive: () => void;
}

// ----------------------------------------------------------------------

/**
 * Component to display live alerts section in camera tile.
 */
const CameraLiveAlerts = ({
  alerts,
  todayAlertsCount,
  onSnapshotClick,
  onViewHistory,
  onViewAllLive,
}: CameraLiveAlertsProps): JSX.Element => {
  /* Refs */
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* Functions */
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  /* Side Effects */
  useEffect(() => {
    if (scrollContainerRef.current && alerts.length > 0) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  /* Output */
  return (
    <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card/50 to-card/30">
      {/* Header with 3-dot menu */}
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold text-foreground">
          Live Alerts
        </span>
        <Badge
          variant="outline"
          className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
        >
          {todayAlertsCount} Today
        </Badge>

        {/* 3-Dot Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto hover:bg-muted"
            >
              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={onViewHistory}
              className="cursor-pointer"
            >
              <History className="w-4 h-4 mr-2" />
              View Detection History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Alerts List */}
      <div
        ref={scrollContainerRef}
        className="space-y-2 max-h-32 overflow-y-auto hide-scrollbar scroll-smooth"
      >
        {alerts.length > 0 ? (
          <>
            {alerts.slice(0, 3).map((alert: any) => (
              <AlertThumbnail
                key={alert.id}
                alert={alert}
                onSnapshotClick={onSnapshotClick}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground">
              No live alerts yet. Waiting for detections...
            </p>
          </div>
        )}
      </div>

      {/* View All Button */}
      {alerts.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-7 text-xs hover:bg-muted flex flex-row gap-4"
          onClick={onViewAllLive}
        >
          <h3>View All Live Alerts ({alerts.length})</h3>
        </Button>
      )}
    </div>
  );
};

export default CameraLiveAlerts;
