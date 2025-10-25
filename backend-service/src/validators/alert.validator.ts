import { z } from "zod";

export const createAlertSchema = z.object({
  cameraId: z.string().min(1, "Camera ID is required"),
  faceCount: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  snapshotUrl: z.string().url().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const alertsQuerySchema = z.object({
  cameraId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
