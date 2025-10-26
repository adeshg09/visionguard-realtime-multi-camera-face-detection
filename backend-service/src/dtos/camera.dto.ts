export interface CameraResponse {
  id: string;
  name: string;
  rtspUrl: string;
  location?: string | null;
  description?: string | null;
  isActive: boolean;
  isOnline: boolean;
  faceDetectionEnabled: boolean;
  targetFPS: number;
  maxFPS: number;
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
  isActive?: boolean;
}

export interface UpdateCameraRequest {
  name?: string;
  rtspUrl?: string;
  location?: string;
  description?: string;
  isActive?: boolean;
  isOnline?: boolean;
  faceDetectionEnabled?: boolean;
  targetFPS?: number;
  maxFPS?: number;
  webrtcUrl?: string | null;
  hlsUrl?: string | null;
  rtmpUrl?: string | null;
  lastOnlineAt?: Date;
  lastOfflineAt?: Date;
}

// ----------------------------------------------------------------------

export interface StartStreamResponse {
  camera: CameraResponse;
}

// ----------------------------------------------------------------------

export interface ToggleFaceDetectionRequest {
  enabled: boolean;
}

// ----------------------------------------------------------------------

export interface UpdateFpsRequest {
  targetFPS: number;
}
