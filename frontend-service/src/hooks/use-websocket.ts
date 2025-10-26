import { useEffect, useCallback, useRef } from "react";
import { getAccessToken } from "@/utilities/auth";
import { websocketService, type WebSocketMessage } from "@/lib/webSocket";

export const useWebSocket = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      const token = getAccessToken();
      if (token) {
        console.log("[useWebSocket] Initializing WebSocket connection");
        websocketService.connect(token);
        isInitialized.current = true;
      }
    }

    // Cleanup on unmount
    return () => {
      if (isInitialized.current) {
        console.log("[useWebSocket] Cleaning up WebSocket connection");
        websocketService.disconnect();
        isInitialized.current = false;
      }
    };
  }, []);

  const onMessage = useCallback(
    (handler: (message: WebSocketMessage) => void) => {
      return websocketService.onMessage(handler);
    },
    []
  );

  const subscribeToCamera = useCallback((cameraId: string) => {
    websocketService.subscribeToCamera(cameraId);
  }, []);

  const unsubscribeFromCamera = useCallback((cameraId: string) => {
    websocketService.unsubscribeFromCamera(cameraId);
  }, []);

  return {
    onMessage,
    subscribeToCamera,
    unsubscribeFromCamera,
    isConnected: websocketService.isConnected(),
  };
};
