export interface CreateCameraRequest {
  name: string;
  rtspUrl: string;
  location: string;
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
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface StartStreamResponse {
  camera: CameraResponse;
  streamUrls: {
    webrtcUrl: string;
    hlsUrl: string;
    rtspUrl: string;
    rtmpUrl: string;
  };
}

export interface StopStreamResponse {
  camera: CameraResponse;
}
