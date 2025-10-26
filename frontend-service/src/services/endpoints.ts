export const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",
};

// ----------------------------------------------------------------------

export const ACCOUNT_ENDPOINTS = {
  GET_USER_PROFILE: "/auth/get-profile",
};

// ----------------------------------------------------------------------

export const ADMIN_DASHBOARD_ENDPOINTS = {
  CAMERAS: {
    GET_CAMERAS: "/cameras/get-cameras",
    GET_CAMERA_BY_ID: "/cameras/get-camera-by-id/:cameraId",
    CREATE_CAMERA: "/cameras/create-camera",
    UPDATE_CAMERA: "/cameras/update-camera/:cameraId",
    DELETE_CAMERA: "/cameras/delete-camera/:cameraId",
    START_CAMERA_STREAM: "/cameras/start-stream/:cameraId",
    STOP_CAMERA_STREAM: "/cameras/stop-stream/:cameraId",
    GET_STREAM_STATUS: "/cameras/get-stream-status/:cameraId",
    TOGGLE_FACE_DETECTION: "/cameras/toggle-face-detection/:cameraId",
    UPDATE_FPS: "/cameras/update-fps/:cameraId",
  },
  ALERTS: {
    GET_ALERTS: "/alerts/get-alerts",
    GET_ALERT_BY_ID: "/alerts/get-alert-by-id/:id",
    GET_RECENT_ALERTS_BY_CAMERA: "/get-recent-alerts-by-camera/:cameraId",
    GET_CAMERA_ALERT_STATS: "/get-camera-alert-stats/:cameraId",
  },
};

// ----------------------------------------------------------------------
