/* Imports */
import { envConfig } from "./env.config.js";

// ----------------------------------------------------------------------

/* Base URLs */
export const baseUrls: Record<string, string> = {
  worker: `${envConfig.WORKER_SERVICE_URL}/api/v1`,
};
