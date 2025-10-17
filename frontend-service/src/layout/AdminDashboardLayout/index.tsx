/* Imports */
import React, { type JSX } from "react";

/* Relative Imports */

/* Local Imports */
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./components/appSidebar";

// ----------------------------------------------------------------------

/* Interface */

/**
 * Interface used to create outer design layout for all admin dashboard pages.
 *
 * @interface AdminDashboardLayoutProps
 * @property {node} children - contains the child components.
 */
export interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

// ----------------------------------------------------------------------

/**
 * Outer design layout for all admin dashboard pages
 *
 * @component
 * @param {node} children - contains the child components
 */
const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
  children,
}): JSX.Element => {
  /* Hooks */

  /* Output */
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminDashboardLayout;
