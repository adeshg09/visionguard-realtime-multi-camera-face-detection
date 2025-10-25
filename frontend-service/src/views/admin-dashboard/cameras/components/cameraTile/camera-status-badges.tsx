/* Imports */
import { type JSX } from "react";
import { Eye, Gauge } from "lucide-react";

/* Local Imports */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------

/* Interface */
interface CameraStatusBadgesProps {
  camera: any;
  isStreaming: boolean;
  isActive: boolean;
}

// ----------------------------------------------------------------------

/**
 * Component to display camera status badges.
 */
const CameraStatusBadges = ({
  camera,
  isStreaming,
}: CameraStatusBadgesProps): JSX.Element => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card to-card/80">
      <div className="flex items-center gap-2 flex-1">
        {/* Face Detection Badge */}
        {camera.faceDetectionEnabled && (
          <Badge
            variant="outline"
            className="ml-2 bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            Face Detection
          </Badge>
        )}

        {isStreaming && (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-500/20 text-xs"
          >
            <Gauge className="w-3 h-3 mr-1" />
            {camera.targetFPS} FPS
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Streaming Status Badge */}
        <Badge
          variant={isStreaming ? "default" : "secondary"}
          className={cn(
            "font-semibold text-xs px-2 py-0 h-5",
            isStreaming
              ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white border-0"
              : "bg-muted-foreground/20 text-muted-foreground"
          )}
        >
          {isStreaming ? (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          ) : (
            "OFFLINE"
          )}
        </Badge>
      </div>
    </div>
  );
};

export default CameraStatusBadges;
