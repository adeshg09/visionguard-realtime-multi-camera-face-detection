export interface CreateCameraRequest {
  name: string;
  rtspUrl: string;
  location?: string;
  description?: string;
  resolution?: string;
  fps?: number;
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
}

export interface CameraResponse {
  id: string;
  name: string;
  rtspUrl: string;
  location?: string | null;
  description?: string | null;
  isActive: boolean;
  isOnline: boolean;
  resolution?: string | null;
  fps: number;
  createdAt: Date;
  updatedAt: Date;
}
