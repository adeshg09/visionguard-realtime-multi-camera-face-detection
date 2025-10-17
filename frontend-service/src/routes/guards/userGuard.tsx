/* Imports */
import { useContext, type JSX } from "react";

/* Relative Imports */
import { Navigate, useLocation } from "react-router-dom";

/* Local Imports */
import SessionContext from "@/context/sessionContext";
import { PAGE_ADMIN_DASHBOARD } from "../paths";

// ----------------------------------------------------------------------

/* Types/Interfaces */
/**
 * Interface used to create component to define protection layout for pages, which are not accessible after login.
 *
 * @interface UserGuardProps
 * @property {node} children - contains the child components.
 */
export interface UserGuardProps {
  children: React.ReactElement;
}

// ----------------------------------------------------------------------
/**
 * Component to define protection layout for pages, which are not accessible after login
 *
 * @component
 * @param {node} children - contains the child components
 * @returns {JSX.Element}
 */

const UserGuard: React.FC<UserGuardProps> = ({ children }): JSX.Element => {
  /* Hooks */
  const { isAuthenticated, user } = useContext(SessionContext);
  const location = useLocation();

  /* Output */
  if (isAuthenticated && user) {
    const redirectPath = PAGE_ADMIN_DASHBOARD.cameras.absolutePath;
    return (
      <Navigate
        to={`${redirectPath}?returnurl=${location.pathname}`}
        state={location.state}
      />
    );
  }

  return children;
};

export default UserGuard;
