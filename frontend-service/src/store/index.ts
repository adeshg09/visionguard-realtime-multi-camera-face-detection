/* Relative Imports */
import { configureStore } from "@reduxjs/toolkit";

/* Local Imports */
import cameraSlice from "./cameraSlice";

// ----------------------------------------------------------------------

const store = configureStore({
  reducer: {
    camera: cameraSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
