/* Relative Imports */
import axios, { AxiosInstance } from "axios";

/* Local Imports */
import { baseUrls } from "@/config/axios.config.js";

// ----------------------------------------------------------------------

/**
 * Create an Axios client instance for a specific service.
 *
 * @param {string} serviceName - The name of the service.
 * @returns {AxiosInstance} - The Axios client instance.
 */

export const createApiClient = (serviceName: string): any => {
  const baseURL = baseUrls[serviceName];

  if (!baseURL) {
    throw new Error(`Invalid service name: ${serviceName}`);
  }

  const axiosInstance: AxiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 120000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      console.log(
        `🧩 [${serviceName.toUpperCase()}] → ${config.method?.toUpperCase()} ${
          config.url
        }`
      );
      return config;
    },
    (error) => {
      console.error(`❌ [${serviceName}] Request error:`, error.message);
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      console.log(`✅ [${serviceName}] Response: ${response.status}`);
      return response;
    },
    (error) => {
      console.error(
        `🚨 [${serviceName}] Response error:`,
        error.response?.status,
        error.message
      );
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};
