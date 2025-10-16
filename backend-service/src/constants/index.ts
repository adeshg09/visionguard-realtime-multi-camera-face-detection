import type { StatusCode } from "hono/utils/http-status";

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

export const TOKEN_EXPIRY = {
  ACCESS: "1d",
  REFRESH: "7d",
  REMEMBER_ME: "30d",
};

export const USER_ROLES = {
  ADMIN: "ADMIN",
  VIEWER: "VIEWER",
  OPERATOR: "OPERATOR",
} as const;

export const RESPONSE_SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
};

export const RESPONSE_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid credentials",
  LOGIN_FAILED: "Login failed",
  USER_NOT_FOUND: "User not found",
  USER_INFO_ERROR: "Unable to fetch user information",
};
