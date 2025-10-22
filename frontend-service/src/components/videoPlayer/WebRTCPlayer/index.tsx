/* Imports */
import { useEffect, useRef, useState, type JSX } from "react";
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
const WebRTCPlayer = ({ webrtcUrl }: WebRTCPlayerProps): JSX.Element => {
  /* Refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* States */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] =
    useState<string>("initializing");

  /* Constants */
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 2000;

  /* Functions */
  const startStream = async (): Promise<void> => {
    const mounted = true;

    try {
      setLoading(true);
      setError(null);
      setConnectionState("connecting");

      const baseUrl = webrtcUrl.endsWith("/")
        ? webrtcUrl.slice(0, -1)
        : webrtcUrl;
      const whepUrl = `${baseUrl}/whep`;

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
            ],
          },
        ],
      });

      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setConnectionState("connected");
          setLoading(false);
          retryCountRef.current = 0;
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        setConnectionState(state);

        if (state === "connected" || state === "completed") {
          setLoading(false);
        } else if (state === "failed") {
          setError("Connection failed");
          setConnectionState("failed");
        }
      };

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(whepUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      if (response.status === 404) {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          setConnectionState(
            `retrying (${retryCountRef.current}/${MAX_RETRIES})`
          );
          retryTimeoutRef.current = setTimeout(
            () => startStream(),
            RETRY_DELAY
          );
          return;
        } else {
          throw new Error(
            "Stream not available. Please try starting the stream again."
          );
        }
      }

      if (!response.ok) {
        await response.text();
        throw new Error(`Connection failed: ${response.status}`);
      }

      const answerSdp = await response.text();

      if (mounted) {
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        setConnectionState("waiting for video");
      }
    } catch (err) {
      if (mounted) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load stream";
        setError(errorMessage);
        setLoading(false);
        setConnectionState("error");
      }
    }
  };

  /* Side-Effects */
  useEffect(() => {
    startStream();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      retryCountRef.current = 0;
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
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 dark:bg-muted/5 z-10">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground capitalize font-medium">
              {connectionState || "Connecting..."}
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
