/* Imports */
import { useEffect, useRef, useState, type JSX } from "react";

/* Relative Imports */
import { Loader2, AlertCircle } from "lucide-react";

// ----------------------------------------------------------------------

/* Interface */
interface WebRTCPlayerProps {
  webrtcUrl: string;
  cameraName: string;
}

// ----------------------------------------------------------------------

/**
 * Component to display WebRTC video stream from MediaMTX.
 *
 * @component
 * @param {WebRTCPlayerProps} props - The component props
 * @returns {JSX.Element}
 */
const WebRTCPlayer = ({
  webrtcUrl,
  cameraName,
}: WebRTCPlayerProps): JSX.Element => {
  /* Refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  /* States */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Functions */
  /**
   * Function to initialize and start WebRTC stream.
   *
   * @returns {Promise<void>}
   */
  const startStream = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Prepare WHEP URL
      const baseUrl = webrtcUrl?.endsWith("/")
        ? webrtcUrl?.slice(0, -1)
        : webrtcUrl;
      const whepUrl = `${baseUrl}/whep`;

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
            ],
          },
        ],
      });

      pcRef.current = pc;

      // Handle incoming tracks
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setLoading(false);
        }
      };

      // Handle connection state changes
      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          setError("Connection lost");
        }
      };

      // Add transceivers
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      // Create and set local offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to MediaMTX via WHEP
      const response = await fetch(whepUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status}`);
      }

      // Set remote answer
      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load stream";
      setError(errorMessage);
      setLoading(false);
      console.error("WebRTC stream error:", err);
    }
  };

  /* Side-Effects */
  useEffect(() => {
    startStream();

    return () => {
      // Cleanup on unmount
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [webrtcUrl]);

  /* Output */
  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-muted/20 dark:bg-muted/5">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            Connection Failed
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Camera: {cameraName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-white" />
            <p className="text-xs text-white/80 font-medium">
              Connecting to {cameraName}...
            </p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        onLoadedData={() => setLoading(false)}
        onError={() => setError("Video playback error")}
      />
    </div>
  );
};

export default WebRTCPlayer;
