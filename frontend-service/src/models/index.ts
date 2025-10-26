/* Interface */
export interface ApiResponse {
  status: {
    response_code: number;
    response_message: string;
  };
  message: string;
  data: any;
}

export type WebSocketMessageType =
  | "ALERT_CREATED"
  | "CAMERA_STATS"
  | "CONNECTED"
  | "PONG";

export interface AlertNotification {
  type: "ALERT_CREATED";
  data: {
    id: string;
    cameraId: string;
    cameraName: string;
    location: string;
    faceCount: number;
    confidence: number;
    snapshotUrl: string | null;
    timestamp: string;
  };
}

export interface CameraStatsNotification {
  type: "CAMERA_STATS";
  data: {
    cameraId: string;
    isOnline: boolean;
    totalAlerts: number;
    recentAlerts: number;
  };
}
