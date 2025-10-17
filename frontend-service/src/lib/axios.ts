/* Imports */
import axios, { type AxiosInstance } from "axios";

/* Local Imports */
import { envConfig } from "@/config/envConfig";
import { getAccessToken, isValidToken } from "@/utilities/auth";

// ----------------------------------------------------------------------

const axiosConfig: AxiosInstance = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
axiosConfig.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();
    if (accessToken && isValidToken(accessToken)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosConfig.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("Unauthorized: Token expired or invalid.");
    }
    return Promise.reject(error);
  }
);

export default axiosConfig;
