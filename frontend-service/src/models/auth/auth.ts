/* Relative Imports */
import { z } from "zod";

// ----------------------------------------------------------------------

export const LoginFormSchema = z.object({
  txtUsername: z
    .string("Username is required")
    .min(3, "Username must be at least 3 characters")
    .max(50),
  txtPassword: z
    .string("Password is required")
    .min(6, "Password must be at least 6 characters"),
  chkRememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof LoginFormSchema>;
