import { z } from "zod";

export const CameraFormSchema = z.object({
  txtName: z.string().min(1, "Camera name is required").max(100),
  txtRtspUrl: z
    .url("Valid RTSP URL is required")
    .startsWith("rtsp://", "Must be an RTSP URL"),
  txtLocation: z.string().max(200).optional(),
  txtDescription: z.string().max(500).optional(),
  txtResolution: z.string().optional(),
  txtFps: z.number().min(1).max(60).optional(),
});

export type CameraFormValues = z.infer<typeof CameraFormSchema>;
