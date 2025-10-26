/* Imports */
import dotenv from "dotenv";

// ----------------------------------------------------------------------

dotenv.config();

// ----------------------------------------------------------------------

/* Environment Variables */
export const envConfig = {
  NODE_ENV: process.env.NODE_ENV,

  DATABASE_URL: process.env.DATABASE_URL,

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,

  BACKEND_WORKER_API_KEY: process.env.BACKEND_WORKER_API_KEY,

  BACKEND_SERVICE_PORT: Number(process.env.BACKEND_SERVICE_PORT),
  BACKEND_SERVICE_WEBSOCKET_PORT: process.env.BACKEND_SERVICE_WEBSOCKET_PORT,

  FRONTEND_SERVICE_URL: process.env.FRONTEND_SERVICE_URL,
  WORKER_SERVICE_URL: process.env.WORKER_SERVICE_URL,
};
