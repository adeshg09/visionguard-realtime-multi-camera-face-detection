/* Local Imports */
import axiosConfig from "@/lib/axios";
import { AUTH_ENDPOINTS } from "../endpoints";
import type { ApiResponse } from "@/models";

// ----------------------------------------------------------------------

/* Interface */
export interface LoginApiRequest {
  username: string;
  password: string;
  rememberMe: boolean;
}

/* Function */
export const loginRequest = (
  reqData: LoginApiRequest
): Promise<ApiResponse> => {
  return axiosConfig
    .post(AUTH_ENDPOINTS.LOGIN, reqData)
    .then((response) => response.data);
};
