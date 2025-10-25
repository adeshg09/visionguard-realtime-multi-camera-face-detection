import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { logger } from "@/libs/logger.lib.js";
import {
  WebSocketClient,
  WebSocketMessage,
  AlertNotification,
} from "@/types/websocket.js";
import { verifyToken } from "@/utils/tokens.js";
import { envConfig } from "@/config/env.config.js";

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(port: number): void {
    this.wss = new WebSocketServer({ port });

    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    logger.info(`WebSocket server started on port ${port}`);
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    // Extract token from query string
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      logger.warn("WebSocket connection rejected: No token provided");
      ws.close(1008, "Authentication required");
      return;
    }

    // Verify token
    const decoded = verifyToken(token, envConfig.ACCESS_TOKEN_SECRET as string);
    if (!decoded) {
      logger.warn("WebSocket connection rejected: Invalid token");
      ws.close(1008, "Invalid token");
      return;
    }

    // Create client
    const clientId = `${decoded.userId}_${Date.now()}`;
    const client: WebSocketClient = {
      id: clientId,
      userId: decoded.userId,
      ws,
      isAlive: true,
      subscribedCameras: new Set(),
    };

    this.clients.set(clientId, client);
    logger.info(
      `WebSocket client connected: ${clientId} (user: ${decoded.userId})`
    );

    // Setup message handlers
    ws.on("message", (data: Buffer) => {
      this.handleMessage(client, data);
    });

    ws.on("pong", () => {
      client.isAlive = true;
    });

    ws.on("close", () => {
      this.clients.delete(clientId);
      logger.info(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on("error", (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });

    // Send welcome message
    this.sendToClient(client, {
      type: "CONNECTED",
      data: {
        clientId,
        message: "Connected to VisionGuard WebSocket server",
      },
    });
  }

  private handleMessage(client: WebSocketClient, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "SUBSCRIBE_CAMERA":
          if (message.cameraId) {
            client.subscribedCameras.add(message.cameraId);
            logger.info(
              `Client ${client.id} subscribed to camera ${message.cameraId}`
            );
          }
          break;

        case "UNSUBSCRIBE_CAMERA":
          if (message.cameraId) {
            client.subscribedCameras.delete(message.cameraId);
            logger.info(
              `Client ${client.id} unsubscribed from camera ${message.cameraId}`
            );
          }
          break;

        case "PING":
          this.sendToClient(client, { type: "PONG", data: {} });
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error("Error handling WebSocket message:", error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          logger.info(`Terminating inactive client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // 30 seconds
  }

  broadcastAlert(alert: AlertNotification): void {
    const message = JSON.stringify(alert);

    this.clients.forEach((client) => {
      // Send to clients subscribed to this camera or to all cameras
      if (
        client.subscribedCameras.size === 0 ||
        client.subscribedCameras.has(alert.data.cameraId)
      ) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(message);
        }
      }
    });

    logger.debug(
      `Alert broadcasted to ${this.clients.size} clients for camera ${alert.data.cameraId}`
    );
  }

  sendToUser(userId: string, message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  sendToClient(client: WebSocketClient, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  getClientsByUser(userId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.userId === userId) count++;
    });
    return count;
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close(1001, "Server shutting down");
    });

    if (this.wss) {
      this.wss.close();
    }

    logger.info("WebSocket server shutdown");
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
