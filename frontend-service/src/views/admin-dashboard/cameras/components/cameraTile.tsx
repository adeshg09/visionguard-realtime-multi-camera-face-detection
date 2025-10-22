/* Imports */
import { type JSX, useState } from "react";
import { MoreVertical, Play, Square, MapPin, Loader2 } from "lucide-react";

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
import ButtonLoader from "@/components/loader/inlineLoader";

// ----------------------------------------------------------------------

/* Interface */
interface CameraTileProps {
  camera: any;
  onEdit: (camera: any) => void;
  onDelete: (cameraId: string) => void;
  onStartStream: (cameraId: string) => void;
  onStopStream: (cameraId: string) => void;
  isStartingStream?: boolean;
  isStoppingStream?: boolean;
}

// ----------------------------------------------------------------------

/**
 * Component to display individual camera tile with video stream.
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
  isStartingStream,
  isStoppingStream,
}: CameraTileProps): JSX.Element => {
  /* States */
  const [isHovered, setIsHovered] = useState(false);

  /* Variables */
  const isStreaming = !!camera.webrtcUrl;
  const isLoading = isStartingStream || isStoppingStream;

  /* Functions */
  const handleStreamToggle = () => {
    if (isStreaming) {
      onStopStream(camera.id);
    } else {
      onStartStream(camera.id);
    }
  };

  /* Output */
  return (
    <Card
      className="flex flex-col h-full w-full overflow-hidden transition-all duration-200 hover:shadow-lg border p-0 gap-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Badge
            variant={isStreaming ? "default" : "secondary"}
            className={cn(
              "font-semibold shrink-0",
              isStreaming
                ? "bg-red-600 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-500"
                : "bg-muted hover:bg-muted"
            )}
          >
            {isStreaming ? "LIVE" : "OFFLINE"}
          </Badge>

          <h3 className="font-semibold text-sm truncate flex-1">
            {camera.name}
          </h3>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(camera)}>
              Edit Camera
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStreamToggle}>
              {isStreaming ? "Stop Stream" : "Start Stream"}
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

      {/* Video Body */}
      <div className="relative aspect-video bg-muted/50 dark:bg-muted/20">
        {isStreaming ? (
          <>
            <WebRTCPlayer
              webrtcUrl={camera.webrtcUrl}
              cameraName={camera.name}
            />

            {/* Stop Button Overlay on Hover */}
            {isHovered && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-all duration-200 z-20">
                <Button
                  onClick={handleStreamToggle}
                  size="lg"
                  disabled={isLoading}
                  variant="destructive"
                  className="shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <Square className="w-5 h-5 mr-2 fill-current" />
                      Stop Stream
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Button
              onClick={handleStreamToggle}
              size="medium"
              disabled={isLoading}
              className="flex items-center whitespace-nowrap"
              leftIcon={
                isLoading ? (
                  <ButtonLoader />
                ) : (
                  <Play className="w-4 h-4 mr-2 fill-current" />
                )
              }
            >
              {isLoading ? "Starting..." : "Start Stream"}
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-card mt-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 flex-1">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{camera.location || "Unknown"}</span>
        </div>

        {(camera.resolution || camera.fps) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            {camera.resolution && (
              <span className="font-mono">{camera.resolution}</span>
            )}
            {camera.resolution && camera.fps && (
              <span className="text-muted-foreground/50">•</span>
            )}
            {camera.fps && <span className="font-mono">{camera.fps}fps</span>}
          </div>
        )}
      </div>
    </Card>
  );
};

export default CameraTile;
