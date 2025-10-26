/* Imports */
import { memo, type JSX, useState } from "react";

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
import { Eye, EyeOff } from "lucide-react";

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
  /* State */
  const [showPassword, setShowPassword] = useState(false);

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

  const togglePasswordVisibility = (): void => {
    setShowPassword((prev) => !prev);
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
                    className="focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  <div className="relative group">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pr-10 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors duration-200 focus:outline-none focus:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      tabIndex={-1} // Prevent tab focus on the button
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                      ) : (
                        <Eye className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                      )}
                    </button>
                  </div>
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
                    className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                  Remember me
                </FormLabel>
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full rounded-[10px] h-11 text-base font-medium transition-all duration-200 hover:shadow-lg"
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
