export interface CameraResponse {
  id: string;
  name: string;
  rtspUrl: string;
  location?: string | null;
  description?: string | null;
  resolution?: string | null;
  fps: number;
  isActive: boolean;
  isOnline: boolean;
  faceDetectionEnabled: boolean;
  frameSkipInterval: number;
  webrtcUrl?: string | null;
  hlsUrl?: string | null;
  rtmpUrl?: string | null;
  lastOnlineAt?: Date | null;
  lastOfflineAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface CreateCameraRequest {
  name: string;
  rtspUrl: string;
  location?: string;
  description?: string;
  resolution?: string;
  fps?: number;
  isActive?: boolean;
}

export interface UpdateCameraRequest {
  name?: string;
  rtspUrl?: string;
  location?: string;
  description?: string;
  resolution?: string;
  fps?: number;
  isActive?: boolean;
  isOnline?: boolean;
  faceDetectionEnabled?: boolean;
  frameSkipInterval?: number;
  webrtcUrl?: string | null;
  hlsUrl?: string | null;
  rtmpUrl?: string | null;
  lastOnlineAt?: Date;
  lastOfflineAt?: Date;
}

export interface StartStreamResponse {
  camera: CameraResponse;
}

export interface ToggleFaceDetectionRequest {
  enabled: boolean;
}

export interface UpdateFrameSkipIntervalRequest {
  frameSkipInterval: number;
}
