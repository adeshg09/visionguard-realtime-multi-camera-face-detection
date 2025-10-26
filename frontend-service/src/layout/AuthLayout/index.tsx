/* Imports */
import React, { type JSX } from "react";

/* Local Imports */
import AuthLayoutBackground from "@/assets/images/authLayoutBackground.jpg";

// ----------------------------------------------------------------------

/* Interface */

/**
 * Interface used to create outer design layout for all auth pages.
 *
 * @interface AuthLayoutProps
 * @property {node} children - contains the child components.
 */
export interface AuthLayoutProps {
  children: React.ReactNode;
}

// ----------------------------------------------------------------------

/**
 * Outer design layout for all auth pages
 *
 * @component
 * @param {node} children - contains the child components
 */

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }): JSX.Element => {
  /* Output */
  return (
    <div className="w-full h-screen grid grid-cols-1 lg:grid-cols-2 bg-secondary-100 overflow-hidden">
      <div className="flex items-center justify-center bg-primary-0 dark:bg-secondary-900 min-h-screen p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div
        className="hidden lg:flex bg-secondary-700 items-center justify-center px-20 py-20 bg-center bg-cover"
        style={{ backgroundImage: `url(${AuthLayoutBackground})` }}
      ></div>
    </div>
  );
};

export default AuthLayout;
