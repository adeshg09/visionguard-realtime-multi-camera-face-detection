/* Imports */
import { type JSX, useRef, useEffect } from "react";
import {
  AlertTriangle,
  ExternalLink,
  MoreVertical,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AlertThumbnail from "./alertThumbnail";

// ----------------------------------------------------------------------

/* Interface */
interface LiveAlertsSectionProps {
  alerts: any[];
  todayAlertsCount: number;
  onSnapshotClick: (snapshotUrl: string) => void;
  onViewHistory: () => void;
  onViewAllLive: () => void;
  formatTimestamp: (timestamp: string) => string;
}

// ----------------------------------------------------------------------

/**
 * Component to display live alerts section in camera tile.
 */
const LiveAlertsSection = ({
  alerts,
  todayAlertsCount,
  onSnapshotClick,
  onViewHistory,
  onViewAllLive,
  formatTimestamp,
}: LiveAlertsSectionProps): JSX.Element => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new alert arrives
  useEffect(() => {
    if (scrollContainerRef.current && alerts.length > 0) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

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
          className="w-full mt-2 h-7 text-xs hover:bg-muted"
          onClick={onViewAllLive}
        >
          View All Live Alerts ({alerts.length})
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
};

export default LiveAlertsSection;
