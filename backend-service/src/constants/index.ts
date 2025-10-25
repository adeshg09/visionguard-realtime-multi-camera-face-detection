/* Imports */
import type { StatusCode } from "hono/utils/http-status";

// ----------------------------------------------------------------------

/* Status Codes */
export const STATUS_CODES: Record<string, StatusCode> = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
};

// ----------------------------------------------------------------------

/* Response Messages */
export const RESPONSE_MESSAGES = {
  SUCCESS: "Success!",
  BAD_REQUEST: "Bad Request!",
  UNAUTHORIZED: "Unauthorized!",
  FORBIDDEN: "Forbidden!",
  NOT_FOUND: "Not Found!",
  SERVER_ERROR: "Internal Server Error!",
  VALIDATION_ERROR: "Validation Error!",
  RESOURCE_EXISTS: "Resource already exists!",
};

// ----------------------------------------------------------------------

/* Token Expiry Durations */
export const TOKEN_EXPIRY = {
  ACCESS: "1d",
  REFRESH: "7d",
  REMEMBER_ME: "30d",
};

// ----------------------------------------------------------------------

/* Response Success Messages */
export const RESPONSE_SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  USER_INFO_FETCHED: "User information fetched successfully",
  CAMERA_CREATED: "Camera created successfully",
  CAMERA_UPDATED: "Camera updated successfully",
  CAMERA_DELETED: "Camera deleted successfully",
  CAMERAS_RETRIEVED: "Cameras retrieved successfully",
  CAMERA_RETRIEVED: "Camera retrieved successfully",
  STREAM_STARTED: "Stream started successfully",
  STREAM_STOPPED: "Stream stopped successfully",
  STREAM_STATUS_FETCHED: "Stream status fetched successfully",
  FACE_DETECTION_ENABLED: "Face detection enabled successfully!",
  FACE_DETECTION_DISABLED: "Face detection disabled successfully!",
  FPS_UPDATED: "FPS settings updated successfully",
  ALERT_CREATED: "Alert created successfully",
  ALERTS_RETRIEVED: "Alerts retrieved successfully",
  ALERT_RETRIEVED: "Alert retrieved successfully",
  ALERT_STATS_RETRIEVED: "Camera alert stats retrieved successfully",
};

// ----------------------------------------------------------------------

/* Response Error Messages */
export const RESPONSE_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid credentials",
  LOGIN_FAILED: "Login failed",
  USER_NOT_FOUND: "User not found",
  USER_INFO_ERROR: "Unable to fetch user information",
  CAMERA_CREATE_FAILED: "Failed to create camera",
  CAMERA_UPDATE_FAILED: "Failed to update camera",
  CAMERA_DELETE_FAILED: "Failed to delete camera",
  CAMERAS_RETRIEVE_FAILED: "Failed to retrieve cameras",
  CAMERA_RETRIEVE_FAILED: "Failed to retrieve camera",
  CAMERA_NOT_FOUND: "Camera not found",
  STREAM_START_FAILED: "Failed to start stream",
  STREAM_STOP_FAILED: "Failed to stop stream",
  STREAM_STATUS_FETCH_FAILED: "Failed to fetch stream status",
  FACE_DETECTION_TOGGLE_FAILED: "Failed to toggle face detection!",
  FPS_UPDATE_FAILED: "Failed to update FPS settings",
  ALERT_CREATE_FAILED: "Failed to create alert",
  ALERTS_RETRIEVE_FAILED: "Failed to retrieve alerts",
  ALERT_RETRIEVE_FAILED: "Failed to retrieve alert",
  ALERT_NOT_FOUND: "Alert not found",
  ALERT_STATS_RETRIEVE_FAILED: "Failed to retrieve camera alert stats",
};
