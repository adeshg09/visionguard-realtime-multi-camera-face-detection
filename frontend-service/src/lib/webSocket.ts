/* Local Imports */
import { envConfig } from "@/config/envConfig";
import type { AlertNotification, CameraStatsNotification } from "@/models";

// ----------------------------------------------------------------------

export type WebSocketMessage =
  | AlertNotification
  | CameraStatsNotification
  | { type: "CONNECTED"; data: any }
  | { type: "PONG"; data: any };

type MessageHandler = (message: WebSocketMessage) => void;
type ErrorHandler = (error: Event) => void;
type CloseHandler = () => void;

// ----------------------------------------------------------------------

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private closeHandlers: Set<CloseHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private subscribedCameras: Set<string> = new Set();

  /**
   * Initializes the WebSocket service.
   *
   * Logs a message to the console indicating that the service has been initialized.
   */
  constructor() {
    console.log("[WebSocket] Service initialized");
  }

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Already connected");
      return;
    }

    const apiBaseUrl = envConfig.apiBaseUrl;

    // Extract protocol and host
    const url = new URL(apiBaseUrl);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    const hostname = url.hostname; // localhost

    // Construct WebSocket URL with port 3001
    const websocketUrl = `${wsProtocol}//${hostname}:3001?token=${token}`;

    console.log("[WebSocket] Connecting to:", websocketUrl);

    try {
      this.ws = new WebSocket(websocketUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      this.scheduleReconnect(token);
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log("[WebSocket] Connected successfully");
    this.reconnectAttempts = 0;

    // Start ping interval to keep connection alive
    this.startPingInterval();

    // Re-subscribe to cameras after reconnection
    this.subscribedCameras.forEach((cameraId) => {
      this.subscribeToCamera(cameraId);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log("[WebSocket] Message received:", message.type, message);

      // Notify all registered handlers
      this.messageHandlers.forEach((handler) => handler(message));
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(event: Event): void {
    console.error("[WebSocket] Error:", event);
    this.errorHandlers.forEach((handler) => handler(event));
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    console.log("[WebSocket] Connection closed");
    this.stopPingInterval();
    this.closeHandlers.forEach((handler) => handler());

    // Try to reconnect
    const token = this.getStoredToken();
    if (token) {
      this.scheduleReconnect(token);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        "[WebSocket] Max reconnection attempts reached. Giving up."
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `[WebSocket] Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimeout = setTimeout(() => {
      console.log("[WebSocket] Attempting to reconnect...");
      this.connect(token);
    }, delay);
  }

  /**
   * Start sending periodic ping messages
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "PING" });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get stored authentication token
   */
  private getStoredToken(): string | null {
    const tokenKey = envConfig.accessTokenKey;
    return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
  }

  /**
   * Subscribe to a specific camera's alerts
   */
  subscribeToCamera(cameraId: string): void {
    console.log(`[WebSocket] Subscribing to camera: ${cameraId}`);
    this.subscribedCameras.add(cameraId);
    this.send({
      type: "SUBSCRIBE_CAMERA",
      cameraId,
    });
  }

  /**
   * Unsubscribe from a camera's alerts
   */
  unsubscribeFromCamera(cameraId: string): void {
    console.log(`[WebSocket] Unsubscribing from camera: ${cameraId}`);
    this.subscribedCameras.delete(cameraId);
    this.send({
      type: "UNSUBSCRIBE_CAMERA",
      cameraId,
    });
  }

  /**
   * Send message to WebSocket server
   */
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("[WebSocket] Cannot send message, not connected");
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Register an error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Register a close handler
   */
  onClose(handler: CloseHandler): () => void {
    this.closeHandlers.add(handler);
    return () => {
      this.closeHandlers.delete(handler);
    };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    console.log("[WebSocket] Disconnecting...");

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPingInterval();
    this.subscribedCameras.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.messageHandlers.clear();
    this.errorHandlers.clear();
    this.closeHandlers.clear();
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
