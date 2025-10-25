export interface WebSocketClient {
  id: string;
  userId: string;
  ws: any;
  isAlive: boolean;
  subscribedCameras: Set<string>;
}

// ----------------------------------------------------------------------

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

// ----------------------------------------------------------------------

export interface CameraStatsNotification {
  type: "CAMERA_STATS";
  data: {
    cameraId: string;
    isOnline: boolean;
    totalAlerts: number;
    recentAlerts: number;
  };
}

// ----------------------------------------------------------------------

export type WebSocketMessage = AlertNotification | CameraStatsNotification;
