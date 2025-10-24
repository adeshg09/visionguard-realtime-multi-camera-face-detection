/* Imports */
import React, { forwardRef, memo, type JSX } from "react";

/* Relative Imports */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { BellIcon, Plus, SettingsIcon } from "lucide-react";
import clsx from "clsx";

/* Local Imports */
import { ROOT_PATH } from "@/routes/paths";
import AppLogo from "@/assets/images/appLogo.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { typography } from "@/theme/typography";

// ----------------------------------------------------------------------
export interface AdminDashboardPageProps {
  title?: string;
  children?: React.ReactNode;
  headerActions?: React.ReactNode;
  addButtonTitle?: string;
  onAddButtonClick?: () => void;
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
    {
      title = "VisionGuard Admin Dashboard",
      children = <></>,
      headerActions,
      addButtonTitle,
      onAddButtonClick,
    },
    ref
  ): JSX.Element => {
    /* hooks */
    const { isMobile } = useSidebar();

    /* output */
    return (
      <div className="relative w-full h-full overflow-hidden" ref={ref}>
        <Helmet>
          <title>{title}</title>
        </Helmet>

        <Card className="flex flex-col h-full rounded-none bg-primary-0 dark:bg-secondary-700 p-0 gap-0">
          <CardHeader className="shrink-0 sticky top-0 z-10 border-b-2 border-b-secondary-100 dark:border-b-secondary-600 px-4 sm:px-6 py-2 flex w-full items-center bg-sidebar">
            {isMobile ? (
              <div className="flex items-center gap-2 w-auto">
                <SidebarTrigger className="h-10 w-10 rounded-md bg-muted/50 hover:bg-muted" />
                <Link to={ROOT_PATH}>
                  <img src={AppLogo} alt="App Logo" className="h-10" />
                </Link>
              </div>
            ) : null}

            <div className="flex items-center gap-2 sm:gap-3 w-auto ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-md bg-muted/50 hover:bg-muted"
              >
                <BellIcon className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-md bg-muted/50 hover:bg-muted"
              >
                <SettingsIcon className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>

              {headerActions ? headerActions : null}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto p-0">
            <Card className="flex flex-col h-full rounded-none p-0 gap-4 bg-transparent border-none border-0 px-6 py-4">
              <CardHeader className="p-0 flex items-center justify-between">
                <CardTitle className={clsx(typography.regular24)}>
                  {title}
                </CardTitle>

                {addButtonTitle ? (
                  <Button
                    onClick={onAddButtonClick}
                    className="flex items-center whitespace-nowrap"
                    leftIcon={<Plus className="h-4 w-4" />}
                    size="medium"
                  >
                    {`Add ${addButtonTitle}`}
                  </Button>
                ) : null}
              </CardHeader>

              <div className="overflow-hidden h-full">{children}</div>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }
);

export default memo(AdminDashboardPage);
