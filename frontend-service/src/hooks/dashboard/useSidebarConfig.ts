/* Imports */
import { useContext } from "react";

/* Local Imports */
import SessionContext from "@/context/sessionContext";
import { adminSidebarConfig } from "@/layout/AdminDashboardLayout/helper/sidebarConfig";

// ----------------------------------------------------------------------

/**
 * Custom hook to get the appropriate sidebar configuration based on user role
 *
 * @returns {object} The sidebar configuration for the current user
 */
export const useSidebarConfig = () => {
  const { user } = useContext(SessionContext);
  const sidebarConfig = adminSidebarConfig;

  return {
    sidebarConfig,
    userRole: user?.role,
  };
};
