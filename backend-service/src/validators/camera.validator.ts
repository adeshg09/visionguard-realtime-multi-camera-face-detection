import z from "zod";

export const createCameraSchema = z.object({
  name: z.string().min(1, "Camera name is required").max(100),
  rtspUrl: z
    .url("Valid RTSP URL is required")
    .startsWith("rtsp://", "Must be an RTSP URL"),
  location: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const updateCameraSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rtspUrl: z.url().startsWith("rtsp://").optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const toggleFaceDetectionSchema = z.object({
  enabled: z.boolean(),
});

export const updateFpsSchema = z.object({
  targetFPS: z.number().min(1).max(60),
});
