/* Imports */
import { memo, type JSX } from "react";

/* Relative Imports */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";

/* Local Imports */
import { LoginFormSchema, type LoginFormValues } from "@/models/auth/auth";
import ButtonLoader from "@/components/loader/inlineLoader";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { typography } from "@/theme/typography";
import { useAuth } from "@/hooks/auth/useAuth";

// ----------------------------------------------------------------------

/* Interface */
export interface LogInFormProps {
  onSubmitSuccess: (token: string, rememberMe: boolean) => void;
}

// ----------------------------------------------------------------------

/**
 * Log In form to validate the credentials
 *
 * @component
 * @param {function} onSubmitSuccess - callback function on successful submission of log in form
 * @returns {JSX.Element}
 */
const LogInForm = ({ onSubmitSuccess }: LogInFormProps): JSX.Element => {
  /* Hooks */
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      txtUsername: "",
      txtPassword: "",
      chkRememberMe: false,
    },
  });
  const { loginMutation } = useAuth();

  /* Functions */
  const handleFormSubmit = async (values: LoginFormValues): Promise<void> => {
    const response = await loginMutation.mutateAsync({
      username: values.txtUsername,
      password: values.txtPassword,
      rememberMe: values.chkRememberMe,
    });
    console.log("res is", response);
    if (response?.data?.tokens?.accessToken) {
      onSubmitSuccess(
        response?.data?.tokens?.accessToken,
        values.chkRememberMe
      );
    }
  };

  /* Output */
  return (
    <div className="w-full max-w-md mx-auto">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-6"
        >
          {/* Username */}
          <FormField
            control={form.control}
            name="txtUsername"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={clsx(typography.regular12)}>
                  Username
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="Enter your username"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="txtPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={clsx(typography.regular12)}>
                  Password
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Enter your password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Remember Me */}
          <FormField
            control={form.control}
            name="chkRememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium cursor-pointer">
                  Remember me
                </FormLabel>
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full rounded-[10px]"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <ButtonLoader text="Logging in..." />
            ) : (
              "Log In"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default memo(LogInForm);
