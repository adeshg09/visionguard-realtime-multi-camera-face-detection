/* Relative Imports */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// ----------------------------------------------------------------------

/* Interface */
interface CameraState {
  cameras: any[];
  loadingCameras: string[];
  selectedCamera: any | null;
  liveAlerts: Record<string, any[]>;
  todayAlertsCounts: Record<string, number>;
}

// ----------------------------------------------------------------------

const initialState: CameraState = {
  cameras: [],
  loadingCameras: [],
  selectedCamera: null,
  liveAlerts: {},
  todayAlertsCounts: {},
};

// ----------------------------------------------------------------------

const cameraSlice = createSlice({
  name: "Camera Slice",
  initialState,
  reducers: {
    setCameras: (state, action: PayloadAction<any[]>) => {
      state.cameras = action.payload;
    },

    updateCamera: (state, action: PayloadAction<any>) => {
      const index = state.cameras.findIndex(
        (cam) => cam.id === action.payload.id
      );
      if (index !== -1) {
        state.cameras[index] = action.payload;
      }
    },

    removeCamera: (state, action: PayloadAction<string>) => {
      state.cameras = state.cameras.filter((cam) => cam.id !== action.payload);
    },

    addLoadingCamera: (state, action: PayloadAction<string>) => {
      if (!state.loadingCameras.includes(action.payload)) {
        state.loadingCameras.push(action.payload);
      }
    },

    removeLoadingCamera: (state, action: PayloadAction<string>) => {
      state.loadingCameras = state.loadingCameras.filter(
        (id) => id !== action.payload
      );
    },

    setSelectedCamera: (state, action: PayloadAction<any | null>) => {
      state.selectedCamera = action.payload;
    },

    addLiveAlert: (
      state,
      action: PayloadAction<{ cameraId: string; alert: any }>
    ) => {
      const { cameraId, alert } = action.payload;
      if (!state.liveAlerts[cameraId]) {
        state.liveAlerts[cameraId] = [];
      }
      state.liveAlerts[cameraId] = [alert, ...state.liveAlerts[cameraId]].slice(
        0,
        15
      );
    },

    clearLiveAlerts: (state, action: PayloadAction<string>) => {
      delete state.liveAlerts[action.payload];
    },

    incrementTodayAlertsCount: (state, action: PayloadAction<string>) => {
      if (!state.todayAlertsCounts[action.payload]) {
        state.todayAlertsCounts[action.payload] = 0;
      }
      state.todayAlertsCounts[action.payload] += 1;
    },

    resetTodayAlertsCount: (state, action: PayloadAction<string>) => {
      state.todayAlertsCounts[action.payload] = 0;
    },
  },
});

export const cameraSliceActions = cameraSlice.actions;
export default cameraSlice;
