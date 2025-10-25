/* Imports */
import { type JSX } from "react";

/* Local Imports */
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------

/* Interface */
interface AlertThumbnailProps {
  alert: any;
  onSnapshotClick: (snapshotUrl: string) => void;
  formatTimestamp: (timestamp: string) => string;
}

// ----------------------------------------------------------------------

/**
 * Component to display a single alert thumbnail.
 */
const AlertThumbnail = ({
  alert,
  onSnapshotClick,
  formatTimestamp,
}: AlertThumbnailProps): JSX.Element => {
  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors",
        "animate-in fade-in slide-in-from-top-2 duration-300"
      )}
    >
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-blue-500 animate-pulse" />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {alert.faceCount} {alert.faceCount === 1 ? "face" : "faces"} detected
          {alert.confidence && ` (${(alert.confidence * 100).toFixed(0)}%)`}
        </p>
        <p className="text-muted-foreground text-xs">
          {formatTimestamp(alert.createdAt)}
        </p>
      </div>

      {alert.snapshotUrl && (
        <img
          src={alert.snapshotUrl}
          alt="Alert snapshot"
          className="w-10 h-10 rounded object-cover shrink-0 border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          loading="lazy"
          onClick={() => onSnapshotClick(alert.snapshotUrl)}
        />
      )}
    </div>
  );
};

export default AlertThumbnail;
