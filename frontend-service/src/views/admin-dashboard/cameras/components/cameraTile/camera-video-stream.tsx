/* Imports */
import { type JSX } from "react";
import { Zap, Loader2 } from "lucide-react";

/* Local Imports */
import WebRTCPlayer from "@/components/videoPlayer/WebRTCPlayer";

// ----------------------------------------------------------------------

/* Interface */
interface CameraVideoStreamProps {
  camera: any;
  isStreaming: boolean;
  isActive: boolean;
  isLoading: boolean;
  isHovered: boolean;
}

// ----------------------------------------------------------------------

/**
 * Component to display camera video stream or placeholder.
 */
const CameraVideoStream = ({
  camera,
  isStreaming,
  isActive,
  isLoading,
  isHovered,
}: CameraVideoStreamProps): JSX.Element => {
  const isStarting = isLoading && !isStreaming;
  const isStopping = isLoading && isStreaming;

  return (
    <div className="relative aspect-video bg-gradient-to-br from-muted/30 to-muted/10 border-b border-border/50">
      {isStreaming ? (
        <>
          <WebRTCPlayer webrtcUrl={camera.webrtcUrl} cameraName={camera.name} />

          {/* Hover Overlay */}
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
  );
};

export default CameraVideoStream;
