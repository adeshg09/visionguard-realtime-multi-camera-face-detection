/* Imports */
import { type JSX } from "react";
import { Power } from "lucide-react";

/* Local Imports */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------

/* Interface */
interface CameraHeaderProps {
  camera: any;
  isActive: boolean;
}

// ----------------------------------------------------------------------

/**
 * Component to display camera header with name and status indicators.
 */
const CameraHeader = ({ camera, isActive }: CameraHeaderProps): JSX.Element => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card to-card/80">
      <div className="flex items-center gap-2 flex-1">
        {/* Camera Active Status Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              isActive
                ? "bg-emerald-500 animate-pulse"
                : "bg-muted-foreground/50"
            )}
            title={isActive ? "Camera Active" : "Camera Inactive"}
          />
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              camera.isOnline
                ? "bg-red-500 animate-pulse"
                : "bg-muted-foreground"
            )}
            title={camera.isOnline ? "Streaming Live" : "Stream Offline"}
          />
        </div>

        {/* Camera Name */}
        <h3 className="font-semibold text-sm truncate text-foreground">
          {camera.name}
        </h3>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Camera Active Status Badge */}
        <Badge
          variant="outline"
          className={cn(
            "font-medium text-xs px-2 py-0 h-5 transition-all duration-300",
            isActive
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
              : "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20"
          )}
        >
          <div className="flex items-center gap-1">
            <Power
              className={cn(
                "w-3 h-3 transition-all duration-300",
                isActive ? "text-emerald-600" : "text-muted-foreground"
              )}
            />
            {isActive ? "Active" : "Inactive"}
          </div>
        </Badge>
      </div>
    </div>
  );
};

export default CameraHeader;
