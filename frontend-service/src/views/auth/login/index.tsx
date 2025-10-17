/* Imports */
import { useContext, type JSX } from "react";

/* Relative Imports */
import clsx from "clsx";

/* Local Imports */
import { typography } from "@/theme/typography";
import AuthPage from "@/components/page/authPage";
import SessionContext from "@/context/sessionContext";
import LoginForm from "./components/loginForm";
import AppLogo from "@/assets/images/appLogo.png";

// ----------------------------------------------------------------------

/**
 * Component to create the login form and it's outer design.
 *
 * @component
 * @returns {JSX.Element}
 */
const LogIn = (): JSX.Element => {
  /* Hooks */
  const { LoginUser } = useContext(SessionContext);

  /* Functions */
  /**
   * function to set token and user details in session context.
   * @param {string} token - auth token to set for api validations
   * @param {boolean} rememberMe - flag to remember user for 30 days
   * @returns {void}
   */
  const handleLogIn = (token: string, rememberMe: boolean): void => {
    console.log("token", token, "rememberMe", rememberMe);
    LoginUser(token, rememberMe);
  };

  return (
    <AuthPage title="Sign In">
      <div className="flex flex-col items-start justify-center gap-6">
        <div className="flex flex-col items-start gap-2">
          <img src={AppLogo} alt="App Logo" className="h-16" />
          <h1 className={typography.semibold24}>Welcome to VisonGuard</h1>
          <p
            className={clsx(
              typography.regular14,
              "text-secondary-400 dark:text-secondary-300"
            )}
          >
            Log In to your account
          </p>
        </div>

        {/* Log In form */}
        <LoginForm onSubmitSuccess={handleLogIn} />
      </div>
    </AuthPage>
  );
};

export default LogIn;
