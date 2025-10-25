export interface CreateAlertRequest {
  cameraId: string;
  faceCount: number;
  confidence: number;
  snapshotUrl?: string | null;
  metadata?: Record<string, any>;
}

export interface AlertResponse {
  id: string;
  cameraId: string;
  faceCount: number;
  confidence: number;
  snapshotUrl: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  camera?: {
    id: string;
    name: string;
    location: string | null;
  };
}

export interface AlertsQueryParams {
  cameraId?: string;
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
