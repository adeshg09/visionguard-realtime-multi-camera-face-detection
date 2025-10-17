/* Imports */
import React, { forwardRef, memo, type JSX } from "react";
import { Helmet } from "react-helmet-async";

// ----------------------------------------------------------------------
export interface AdminDashboardPageProps {
  title?: string;
  children?: React.ReactNode;
}

// ----------------------------------------------------------------------

/**
 * displays title, Layout for admin dashboard components.
 *
 * @component
 * @param {string} title - contains page title in tab bar.
 * @param {node} children - contains data or component.
 * @returns {JSX.Element}
 */

const AdminDashboardPage = forwardRef<HTMLDivElement, AdminDashboardPageProps>(
  (
    { title = "VisionGuard Admin Dashboard", children = <></> },
    ref
  ): JSX.Element => {
    return (
      <div className="relative w-full h-full overflow-hidden" ref={ref}>
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {children}
      </div>
    );
  }
);

export default memo(AdminDashboardPage);
