import { Toast } from "@/components/toast";
import { loginRequest } from "@/services/auth/auth";
import { useMutation } from "@tanstack/react-query";

export const useAuth = (): any => {
  const loginMutation = useMutation({
    mutationFn: async ({ username, password, rememberMe }: any) => {
      const response = await loginRequest({
        username,
        password,
        rememberMe: rememberMe,
      });

      if (response.status.response_code === 200) {
        return response;
      }
    },
    onSuccess: (response: any) => {
      Toast.success({ message: "Success", description: response.message });
    },
    onError: (error: any) => {
      console.log("login error", error?.response?.data?.message);
      Toast.error({
        message: "Error",
        description: error?.response?.data?.message,
      });
    },
  });
  return {
    loginMutation,
  };
};
