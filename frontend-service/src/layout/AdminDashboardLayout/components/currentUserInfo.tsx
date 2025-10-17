/* Imports */
import React, { useContext, type JSX } from "react";

/* Relative Imports */
import { User, LogOut } from "lucide-react";

/* Local Imports */
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import clsx from "clsx";
import { typography } from "@/theme/typography";
import SessionContext from "@/context/sessionContext";

// ----------------------------------------------------------------------

/**
 * Component to display current user information with logout option
 *
 * @component
 * @returns {JSX.Element}
 */
const CurrentUserInfo: React.FC = (): JSX.Element => {
  /* Hooks */
  const { user, LogoutUser } = useContext(SessionContext);

  /* Handlers */
  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent button
    LogoutUser();
  };

  /* Output */
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="relative group">
          <SidebarMenuButton
            size="lg"
            className="bg-gradient-to-br from-primary-0 to-primary-50/30 dark:from-secondary-600 dark:to-secondary-700 border-2 border-secondary-100 dark:border-secondary-500 rounded-[12px] gap-3 px-4 py-7 cursor-default hover:bg-gradient-to-br hover:from-primary-0 hover:to-primary-50/30 dark:hover:from-secondary-600 dark:hover:to-secondary-700 shadow-sm hover:shadow-md transition-all duration-200"
            asChild
          >
            <div className="flex items-center w-full gap-3">
              {/* Avatar with gradient ring */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 dark:from-primary-500 dark:to-primary-700 rounded-lg blur-sm opacity-50"></div>
                <div className="relative bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white flex aspect-square size-10 items-center justify-center rounded-lg shadow-lg">
                  <User className="size-5" strokeWidth={2.5} />
                </div>
              </div>

              {/* User Info */}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className={clsx(typography.semibold14, "truncate")}>
                  {user?.username || "Guest User"}
                </span>
                <span
                  className={clsx(
                    typography.regular12,
                    "truncate text-secondary-300"
                  )}
                >
                  {user?.role || "User"}
                </span>
              </div>

              {/* Logout Button - Using div instead of Button component */}
              <div
                onClick={handleLogout}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLogout(e as any);
                  }
                }}
                className="flex items-center justify-center size-8 rounded-lg bg-secondary-100 dark:bg-secondary-500 hover:bg-red-100 dark:hover:bg-red-900/30 text-secondary-600 dark:text-secondary-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <LogOut className="size-4" strokeWidth={2} />
              </div>
            </div>
          </SidebarMenuButton>

          <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary-300 to-transparent dark:via-primary-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default CurrentUserInfo;
