export const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",
};

export const ACCOUNT_ENDPOINTS = {
  GET_USER_PROFILE: "/auth/get-profile",
};

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
    UPDATE_FRAME_SKIP_INTERVAL: "/cameras/update-frame-skip-interval/:cameraId",
  },
};
