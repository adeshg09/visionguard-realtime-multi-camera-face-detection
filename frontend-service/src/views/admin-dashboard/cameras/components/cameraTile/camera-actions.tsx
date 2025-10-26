/* Imports */
import { type JSX, useState, useEffect } from "react";
import { Play, Square, Settings, Loader2, Eye, Gauge } from "lucide-react";

/* Local Imports */
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
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------

/* Interface */
interface CameraActionsProps {
  camera: any;
  isStreaming: boolean;
  isActive: boolean;
  isLoading: boolean;
  onEdit: (camera: any) => void;
  onDelete: (cameraId: string) => void;
  onStartStream: (cameraId: string) => void;
  onStopStream: (cameraId: string) => void;
  onToggleFaceDetection: (enabled: boolean) => Promise<void>;
  onUpdateFPS: (fps: number) => Promise<void>;
}

// ----------------------------------------------------------------------

/**
 * Component to display camera action buttons and settings.
 */
const CameraActions = ({
  camera,
  isStreaming,
  isActive,
  isLoading,
  onEdit,
  onDelete,
  onStartStream,
  onStopStream,
  onToggleFaceDetection,
  onUpdateFPS,
}: CameraActionsProps): JSX.Element => {
  /* States */
  const [faceDetectionEnabled, setFaceDetectionEnabled] = useState(
    camera.faceDetectionEnabled || false
  );
  const [targetFPS, setTargetFPS] = useState(camera.targetFPS || 15);
  const [maxFPS, setMaxFPS] = useState(camera.maxFPS || 30);

  /* Constants */
  const fpsOptions = [5, 10, 15, 20, 25, 30];

  /* Functions */
  const handleStreamToggle = (): void => {
    if (isStreaming) {
      onStopStream(camera.id);
    } else {
      onStartStream(camera.id);
    }
  };

  const handleToggleFaceDetection = async (enabled: boolean): Promise<void> => {
    setFaceDetectionEnabled(enabled);
    await onToggleFaceDetection(enabled);
  };

  const handleUpdateFPS = async (fps: number): Promise<void> => {
    setTargetFPS(fps);
    await onUpdateFPS(fps);
  };

  /* Side Effects */
  useEffect(() => {
    if (camera.maxFPS) setMaxFPS(camera.maxFPS);
    if (camera.targetFPS) setTargetFPS(camera.targetFPS);
  }, [camera.maxFPS, camera.targetFPS]);

  /* Output */
  return (
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
              disabled={!isStreaming}
              className={cn(!isStreaming && "opacity-50 cursor-not-allowed")}
            />
          </DropdownMenuLabel>

          {/* FPS Control */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              disabled={!isStreaming}
              className="flex items-center gap-2 text-xs"
            >
              <Gauge className="w-4 h-4" />
              <span>Processing FPS</span>
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
                    disabled={!isStreaming}
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
                      disabled={!isStreaming}
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
                {isStreaming ? "Stopping..." : "Starting..."}
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
  );
};

export default CameraActions;
