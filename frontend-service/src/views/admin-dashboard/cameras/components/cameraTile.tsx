/* Imports */
import { type JSX, useState, useEffect, useCallback } from "react";
import {
  Play,
  Square,
  Settings,
  Zap,
  Loader2,
  Power,
  Eye,
  Gauge,
} from "lucide-react";

/* Local Imports */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import WebRTCPlayer from "@/components/videoPlayer/WebRTCPlayer";
import { useCamera } from "@/hooks/dashboard/use-camera";
import { useAlert } from "@/hooks/dashboard/use-alert";
import { useWebSocket } from "@/hooks/use-websocket";
import type { AlertNotification } from "@/models";
import { cn } from "@/lib/utils";
import Toast from "@/components/toast";

// Component imports
import LiveAlertsSection from "./liveAlertsSection";
import SnapshotPreviewDialog from "./snapshotPreviewDialog";
import AlertHistoryDialog from "./alertHistoryDialog";
import LiveAlertsDialog from "./liveAlertsDialog";

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
  const [faceDetectionEnabled, setFaceDetectionEnabled] = useState(
    camera.faceDetectionEnabled || false
  );
  const [targetFPS, setTargetFPS] = useState(camera.targetFPS || 15);
  const [maxFPS, setMaxFPS] = useState(camera.maxFPS || 30);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [todayAlertsCount, setTodayAlertsCount] = useState(0);

  // Dialog states
  const [snapshotPreviewUrl, setSnapshotPreviewUrl] = useState<string | null>(
    null
  );
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showLiveAlertsDialog, setShowLiveAlertsDialog] = useState(false);

  /* Hooks */
  const { toggleFaceDetectionMutation, updateFpsMutation } = useCamera();

  const { getAlertsMutation } = useAlert();
  const { onMessage, subscribeToCamera, unsubscribeFromCamera } =
    useWebSocket();

  /* Constants */
  const isStreaming = camera.isOnline;
  const isActive = camera.isActive;
  const isStarting = isLoading && !isStreaming;
  const isStopping = isLoading && isStreaming;
  const webrtcUrl = camera?.webrtcUrl;

  const fpsOptions = [5, 10, 15, 20, 25, 30];
  const MAX_LIVE_ALERTS = 15;

  /* Functions */
  const handleStreamToggle = (): void => {
    if (isStreaming) {
      onStopStream(camera?.id);
    } else {
      onStartStream(camera?.id);
    }
  };

  const handleToggleFaceDetection = async (enabled: boolean): Promise<void> => {
    await toggleFaceDetectionMutation.mutateAsync({
      cameraId: camera.id,
      reqData: { enabled },
    });
    setFaceDetectionEnabled(enabled);
  };

  const handleUpdateFPS = async (fps: number): Promise<void> => {
    await updateFpsMutation.mutateAsync({
      cameraId: camera.id,
      reqData: { targetFPS: fps },
    });
    setTargetFPS(fps);
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

  const handleSnapshotClick = (url: string) => {
    setSnapshotPreviewUrl(url);
    setShowSnapshotDialog(true);
  };

  const handleViewHistory = () => {
    setShowHistoryDialog(true);
  };

  const handleViewAllLive = () => {
    setShowLiveAlertsDialog(true);
  };

  const fetchAlertHistory = async (cameraId: string, page: number) => {
    const response = await getAlertsMutation.mutateAsync({
      cameraId,
      page,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    console.log("res is;", response);
    return response;
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback(
    (message: any) => {
      if (message.type === "ALERT_CREATED") {
        const alertData = message as AlertNotification;

        if (alertData.data.cameraId === camera.id) {
          console.log(`[CameraTile] New alert for camera ${camera.id}`);

          // Add to live alerts (newest first)
          setLiveAlerts((prev) => {
            const newAlert = {
              id: alertData.data.id,
              cameraId: alertData.data.cameraId,
              faceCount: alertData.data.faceCount,
              confidence: alertData.data.confidence,
              snapshotUrl: alertData.data.snapshotUrl,
              createdAt: alertData.data.timestamp,
            };
            return [newAlert, ...prev].slice(0, MAX_LIVE_ALERTS);
          });

          // Increment today's count
          setTodayAlertsCount((prev) => prev + 1);

          // Show toast
          Toast.info({
            message: `New Alert - ${alertData.data.cameraName}`,
            description: `${alertData.data.faceCount} face(s) detected`,
          });
        }
      }
    },
    [camera.id]
  );

  /* Side Effects */
  useEffect(() => {
    // Subscribe to WebSocket
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

  useEffect(() => {
    if (camera.maxFPS) {
      setMaxFPS(camera.maxFPS);
    }
    if (camera.targetFPS) {
      setTargetFPS(camera.targetFPS);
    }
  }, [camera.maxFPS, camera.targetFPS]);

  /* Output */
  return (
    <>
      <Card
        className="flex flex-col h-full w-full overflow-hidden transition-all duration-300 hover:shadow-xl border border-border/50 bg-card p-0 gap-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header with Camera Name and Status */}
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
                  isStreaming
                    ? "bg-red-500 animate-pulse"
                    : "bg-muted-foreground"
                )}
                title={isStreaming ? "Streaming Live" : "Stream Offline"}
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

        {/* Status Badges Row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-card to-card/80">
          <div className="flex items-center gap-2 flex-1">
            {/* Face Detection Badge */}
            {faceDetectionEnabled && (
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
                {targetFPS} FPS
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

        {/* Video Stream Section */}
        <div className="relative aspect-video bg-gradient-to-br from-muted/30 to-muted/10 border-b border-border/50">
          {isStreaming ? (
            <>
              <WebRTCPlayer webrtcUrl={webrtcUrl} cameraName={camera.name} />

              {/* Hover Overlay */}
              {isHovered && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-all duration-200 z-20">
                  <div className="text-center text-white p-4">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center mx-auto mb-3">
                      <Zap className="w-6 h-6 text-white/70" />
                    </div>
                    <p className="font-medium text-sm mb-1">
                      Live Stream Active
                    </p>
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
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto border-2 border-dashed border-muted-foreground/30">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {isActive ? "Stream Offline" : "Camera Inactive"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {isActive
                        ? "Start the stream to view live footage"
                        : "Camera is inactive and cannot stream"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Alerts Section */}
        <LiveAlertsSection
          alerts={liveAlerts}
          todayAlertsCount={todayAlertsCount}
          onSnapshotClick={handleSnapshotClick}
          onViewHistory={handleViewHistory}
          onViewAllLive={handleViewAllLive}
          formatTimestamp={formatTimestamp}
        />

        {/* Action Buttons Section */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-card to-card/80">
          {/* Stream Control Button */}
          <Button
            onClick={handleStreamToggle}
            size="sm"
            disabled={isLoading || !isActive}
            variant={isStreaming ? "outline" : "default"}
            className={cn(
              "font-medium transition-all duration-200 min-w-20",
              isStreaming
                ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                : !isActive
                ? "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed"
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
            {!isActive
              ? "Inactive"
              : isLoading
              ? "Loading..."
              : isStreaming
              ? "Stop Stream"
              : "Start Stream"}
          </Button>

          {/* Settings Dropdown */}
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
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => onEdit(camera)}>
                Edit Camera
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Face Detection Toggle */}
              <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
                <span className="flex items-center gap-2 text-xs">
                  <Eye className="w-4 h-4" />
                  Face Detection
                </span>
                <Switch
                  checked={faceDetectionEnabled}
                  onCheckedChange={handleToggleFaceDetection}
                  disabled={
                    toggleFaceDetectionMutation?.isPending || !isStreaming
                  }
                  className={cn(
                    toggleFaceDetectionMutation?.isPending &&
                      "opacity-50 cursor-not-allowed"
                  )}
                />
              </DropdownMenuLabel>

              {/* Frame Skip Interval */}
              {/* FPS Control */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  disabled={updateFpsMutation?.isPending || !isStreaming}
                  className="flex items-center gap-2 text-xs"
                >
                  <Gauge className="w-4 h-4" />
                  <span>Processing FPS</span>
                  {updateFpsMutation?.isPending && (
                    <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel className="flex items-center justify-between text-xs">
                    <span>Current: {targetFPS}</span>
                    <span className="text-muted-foreground">Max: {maxFPS}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <div className="px-3 py-2">
                    <div className="space-y-3">
                      <Slider
                        value={[targetFPS]}
                        onValueChange={(value) => handleUpdateFPS(value[0])}
                        max={maxFPS}
                        min={1}
                        step={1}
                        className="w-full"
                        disabled={updateFpsMutation?.isPending || !isStreaming}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1 FPS (Low Power)</span>
                        <span>{maxFPS} FPS (Max Accuracy)</span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-xs px-2 py-1.5">
                    Quick Presets
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={targetFPS.toString()}
                    onValueChange={(value) => handleUpdateFPS(parseInt(value))}
                  >
                    {fpsOptions
                      .filter((fps) => fps <= maxFPS)
                      .map((fps) => (
                        <DropdownMenuRadioItem
                          key={fps}
                          value={fps.toString()}
                          disabled={
                            updateFpsMutation?.isPending || !isStreaming
                          }
                          className="text-xs"
                        >
                          {fps} FPS
                          {fps === maxFPS && " (Max)"}
                          {fps <= 10 && " (Low Power)"}
                        </DropdownMenuRadioItem>
                      ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleStreamToggle}
                disabled={isLoading || !isActive}
              >
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

      {/* Dialogs */}
      <SnapshotPreviewDialog
        open={showSnapshotDialog}
        onOpenChange={setShowSnapshotDialog}
        snapshotUrl={snapshotPreviewUrl}
      />

      <AlertHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        cameraId={camera.id}
        cameraName={camera.name}
        onSnapshotClick={handleSnapshotClick}
        fetchAlerts={fetchAlertHistory}
      />

      <LiveAlertsDialog
        open={showLiveAlertsDialog}
        onOpenChange={setShowLiveAlertsDialog}
        cameraName={camera.name}
        liveAlerts={liveAlerts}
        onSnapshotClick={handleSnapshotClick}
        formatTimestamp={formatTimestamp}
      />
    </>
  );
};

export default CameraTile;
