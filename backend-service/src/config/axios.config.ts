import { envConfig } from "./env.config.js";

export const baseUrls: Record<string, string> = {
  worker: `${envConfig.WORKER_SERVICE_URL}/api/v1`,
};
