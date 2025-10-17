/* Imports */
import React, { forwardRef, memo, type JSX } from "react";

/* Relative Imports */
import { Helmet } from "react-helmet-async";

// ----------------------------------------------------------------------
export interface AuthPageProps {
  title?: string;
  children?: React.ReactNode;
}

// ----------------------------------------------------------------------

/**
 * Component to display title, Layout for Auth.
 *
 * @component
 * @param {string} title - contains page title in tab bar.
 * @param {node} children - contains data or component.
 * @returns {JSX.Element}
 */

const AuthPage = forwardRef<HTMLDivElement, AuthPageProps>(
  ({ title = "VisionGuard Login", children = <></> }, ref): JSX.Element => {
    return (
      <div className="relative w-full h-full" ref={ref}>
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {children}
      </div>
    );
  }
);

export default memo(AuthPage);
