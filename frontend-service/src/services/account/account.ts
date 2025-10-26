/* Local Imports */
import type { ApiResponse } from "@/models";
import { ACCOUNT_ENDPOINTS } from "../endpoints";
import axiosConfig from "@/lib/axios";

// ----------------------------------------------------------------------

/**
 * Retrieves the current user's profile information.
 *
 * @returns {Promise<ApiResponse>} - Promise of user profile response
 */
export const getUserProfileRequest = (): Promise<ApiResponse> => {
  return axiosConfig
    .get(ACCOUNT_ENDPOINTS.GET_USER_PROFILE)
    .then((response) => response.data);
};
