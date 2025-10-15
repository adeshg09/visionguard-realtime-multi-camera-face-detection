import { Hono } from "hono";
import { RESPONSE_MESSAGES, STATUS_CODES } from "../constants";
import { successResponse } from "../utils/response";

export const createRoutes = () => {
  const api = new Hono();

  // Health Check
  api.get("/health", (c) => {
    return successResponse(
      c,
      STATUS_CODES.OK,
      RESPONSE_MESSAGES.SUCCESS,
      "VisionGuard Backend Service is running",
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "VisionGuard Backend Service",
        version: "1.0.0",
        environment: process.env.NODE_ENV,
      }
    );
  });

  return api;
};
