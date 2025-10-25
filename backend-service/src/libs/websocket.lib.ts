/* Imports */
import { IncomingMessage } from "http";

/* Relative Imports */
import { WebSocket, WebSocketServer } from "ws";

/* Local Imports */
import { logger } from "@/libs/logger.lib.js";
import {
  WebSocketClient,
  WebSocketMessage,
  AlertNotification,
} from "@/types/websocket.js";
import { verifyToken } from "@/utils/tokens.js";
import { envConfig } from "@/config/env.config.js";

// ----------------------------------------------------------------------

/**
 * WebSocket Service to manage WebSocket connections and communications.
 *
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the WebSocket server to listen on a specific port.
   *
   * @param {number} port - The port number to listen on.
   * @return {void}
   */
  initialize(port: number): void {
    this.wss = new WebSocketServer({ port });

    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    logger.info(`WebSocket server started on port ${port}`);
  }

  /**
   * Handles incoming WebSocket connections.
   *
   * Extracts the token from the query string, verifies it and creates a new WebSocket client.
   * Sets up message handlers for the client and sends a welcome message.
   *
   * @param {WebSocket} ws - The incoming WebSocket connection.
   * @param {IncomingMessage} request - The IncomingMessage associated with the connection.
   * @return {void}
   */
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

  /**
   * Handles incoming WebSocket messages.
   *
   * Supported message types:
   *  - `SUBSCRIBE_CAMERA`: Subscribe to camera alerts.
   *  - `UNSUBSCRIBE_CAMERA`: Unsubscribe from camera alerts.
   *  - `PING`: Ping request.
   * @param {WebSocketClient} client - The WebSocket client sending the message.
   * @param {Buffer} data - The message data.
   * @returns {void}
   */
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

  /**
   * Starts a heartbeat interval to periodically check for inactive clients.
   *
   * Every 30 seconds, the server will iterate through all connected clients and
   * terminate any inactive clients. A client is considered inactive if it has not
   * responded to a ping request within the last 30 seconds.
   * @returns {void}
   *
   */
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

  /**
   * Broadcasts an alert notification to all connected clients.
   *
   * @param {AlertNotification} alert - The alert notification to broadcast.
   * @returns {void}
   */
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

  /**
   * Sends a message to all connected WebSocket clients belonging to the specified user.
   *
   * @param {string} userId - The user ID to send the message to.
   * @param {WebSocketMessage} message - The message to send.
   * @returns {void}
   */
  sendToUser(userId: string, message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Sends a message to the specified WebSocket client.
   *
   * @param {WebSocketClient} client - The client to send the message to.
   * @param {any} message - The message to send.
   * @returns {void}
   */
  sendToClient(client: WebSocketClient, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Returns the number of currently connected WebSocket clients.
   *
   * @returns {number} The number of connected clients.
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Returns the number of connected WebSocket clients for the specified user.
   *
   * @param {string} userId - The user ID to count the connected clients for.
   * @returns {number} The number of connected clients for the specified user.
   */
  getClientsByUser(userId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.userId === userId) count++;
    });
    return count;
  }

  /**
   * Shuts down the WebSocket server.
   *
   * Clears the heartbeat interval, closes all connected clients with a status code of 1001,
   * and closes the WebSocket server itself.
   * @returns {void}
   */
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

// ----------------------------------------------------------------------

/**
 * Singleton instance of the WebSocketService.
 */
export const websocketService = new WebSocketService();
