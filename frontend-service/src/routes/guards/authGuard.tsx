/* Imports */
import { useContext, type JSX } from "react";

/* Relative Imports */
import { Navigate, useLocation } from "react-router-dom";

/* Local Imports */
import { PAGE_ROOT } from "../paths";
import SessionContext from "@/context/sessionContext";

// ----------------------------------------------------------------------

/* Types/Interfaces */
/**
 * Interface used to create component to define protection layout for pages, which are not accessible without login.
 *
 * @interface AuthGuardProps
 * @property {node} children - contains the child components.
 */
export interface AuthGuardProps {
  children: React.ReactElement;
}

// ----------------------------------------------------------------------

/**
 * Component to define protection layout for pages, which are not accessible without login
 *
 * @component
 * @param {node} children - contains the child components
 * @returns {JSX.Element}
 */

const AuthGuard: React.FC<AuthGuardProps> = ({ children }): JSX.Element => {
  /* Hooks */
  const { isAuthenticated } = useContext(SessionContext);
  const location = useLocation();

  /* Output */
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`${PAGE_ROOT.login.absolutePath}?returnurl=${location.pathname}`}
      />
    );
  }

  return children;
};

export default AuthGuard;
