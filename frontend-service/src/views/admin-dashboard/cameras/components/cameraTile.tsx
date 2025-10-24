/* Imports */
import { type JSX, useState } from "react";
import {
  Play,
  Square,
  Settings,
  AlertTriangle,
  Zap,
  Loader2,
} from "lucide-react";

/* Local Imports */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import WebRTCPlayer from "@/components/videoPlayer/WebRTCPlayer";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------

/* Interface */
interface CameraTileProps {
  camera: any;
  onEdit: (camera: any) => void;
  onDelete: (cameraId: string) => void;
  onStartStream: (cameraId: string) => void;
  onStopStream: (cameraId: string) => void;
  isLoading: boolean;
}

// ----------------------------------------------------------------------

/**
 * Component to display individual camera tile with video stream and alerts.
 *
 * @component
 * @param {CameraTileProps} props - The component props
 * @returns {JSX.Element}
 */
const CameraTile = ({
  camera,
  onEdit,
  onDelete,
  onStartStream,
  onStopStream,
  isLoading,
}: CameraTileProps): JSX.Element => {
  /* States */
  const [isHovered, setIsHovered] = useState(false);

  /* Constants */
  const isStreaming = camera.isOnline;
  const isStarting = isLoading && !isStreaming;
  const isStopping = isLoading && isStreaming;
  const webrtcUrl = camera.streamUrls?.webrtcUrl;

  console.log("webrtcurl", webrtcUrl);

  // Mock alerts data - replace with actual data from your API
  const mockAlerts = [
    {
      id: 1,
      type: "face",
      message: "Face Detected (2 faces)",
      timestamp: "01:12:45 AM",
    },
    {
      id: 2,
      type: "face",
      message: "Face Detected (1 face)",
      timestamp: "01:09:32 AM",
    },
    {
      id: 3,
      type: "motion",
      message: "Motion Detected",
      timestamp: "01:05:18 AM",
    },
  ];

  /* Functions */
  const handleStreamToggle = (): void => {
    if (isStreaming) {
      onStopStream(camera?.id);
    } else {
      onStartStream(camera?.id);
    }
  };

  const handleSnapshot = (): void => {
    // TODO: Implement snapshot functionality
    console.log("Take snapshot for camera:", camera.id);
  };

  /* Output */
  return (
    <Card
      className="flex flex-col h-full w-full overflow-hidden transition-all duration-300 hover:shadow-xl border border-border/50 bg-card p-0 gap-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Camera Name and Status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card to-card/80 bg-primary-500">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isStreaming ? "bg-red-500 animate-pulse" : "bg-muted-foreground"
            )}
          />
          <h3 className="font-semibold text-sm truncate text-foreground">
            {camera.name}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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

      {/* Section 2: Video Stream */}
      <div className="relative aspect-video bg-gradient-to-br from-muted/30 to-muted/10 border-b border-border/50">
        {isStreaming ? (
          <>
            <WebRTCPlayer webrtcUrl={webrtcUrl} cameraName={camera.name} />

            {/* Hover Overlay - Only show info text */}
            {isHovered && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-all duration-200 z-20">
                <div className="text-center text-white p-4">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-white/70" />
                  </div>
                  <p className="font-medium text-sm mb-1">Live Stream Active</p>
                  <p className="text-xs text-white/70">
                    Click settings for stream controls
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            {isStarting ? (
              /* Loading State when Starting Stream */
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Starting Stream...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Initializing camera connection
                  </p>
                </div>
              </div>
            ) : isStopping ? (
              /* Loading State when Stopping Stream */
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Stopping Stream...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Closing camera connection
                  </p>
                </div>
              </div>
            ) : (
              /* Default Offline State */
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto border-2 border-dashed border-muted-foreground/30">
                  <Zap className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Stream Offline
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Start the stream to view live footage
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Alerts Section */}
      <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card/50 to-card/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">
            Live Alerts
          </span>
          <Badge
            variant="outline"
            className="ml-auto text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
          >
            {mockAlerts.length} New
          </Badge>
        </div>

        <div className="space-y-2 max-h-20 overflow-y-auto hide-scrollbar">
          {mockAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                  alert.type === "face" ? "bg-blue-500" : "bg-amber-500"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {alert.message}
                </p>
                <p className="text-muted-foreground text-xs">
                  {alert.timestamp}
                </p>
              </div>
            </div>
          ))}

          {mockAlerts.length === 0 && (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">
                No alerts in the last 24h
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Action Buttons */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-card to-card/80">
        {/* Left: Stream Control Button */}
        <Button
          onClick={handleStreamToggle}
          size="sm"
          disabled={isLoading}
          variant={isStreaming ? "outline" : "default"}
          className={cn(
            "font-medium transition-all duration-200 min-w-20",
            isStreaming
              ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
          )}
          leftIcon={
            isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isStreaming ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )
          }
        >
          {isLoading
            ? "Loading..."
            : isStreaming
            ? "Stop Stream"
            : "Start Stream"}
        </Button>

        {/* Right: Settings/Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 hover:bg-muted/80 transition-colors"
              disabled={isLoading}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(camera)}>
              Edit Camera
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSnapshot}
              disabled={!isStreaming || isLoading}
            >
              Take Snapshot
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStreamToggle} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isStarting ? "Starting..." : "Stopping..."}
                </div>
              ) : isStreaming ? (
                "Stop Stream"
              ) : (
                "Start Stream"
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(camera.id)}
              className="text-destructive focus:text-destructive"
            >
              Delete Camera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

export default CameraTile;
