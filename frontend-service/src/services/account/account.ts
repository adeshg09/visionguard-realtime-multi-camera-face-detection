/* Local Imports */
import type { ApiResponse } from "@/models";
import { ACCOUNT_ENDPOINTS } from "../endpoints";
import axiosConfig from "@/lib/axios";

// ----------------------------------------------------------------------
/* Function */
export const getUserProfileRequest = (): Promise<ApiResponse> => {
  return axiosConfig
    .get(ACCOUNT_ENDPOINTS.GET_USER_PROFILE)
    .then((response) => response.data);
};
