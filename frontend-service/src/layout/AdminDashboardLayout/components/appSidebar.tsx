/* Imports */
import React, { type JSX } from "react";

/* Relative Imports */
import { Link } from "react-router-dom";

/* Local Imports */
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ROOT_PATH } from "@/routes/paths";
import AppLogoName from "@/assets/images/appLogoName.png";
import { useSidebarConfig } from "@/hooks/dashboard/useSidebarConfig";
import SidebarConfigRenderer from "./sidebarConfigRenderer";
import CurrentUserInfo from "./currentUserInfo";
// ----------------------------------------------------------------------

/* Interface */

// ----------------------------------------------------------------------

/**
 * AppSidebar component using Shadcn Sidebar, with full typing.
 *
 * @component
 * @param props - All props supported by Sidebar
 * @returns JSX.Element
 */
const AppSidebar: React.FC<React.ComponentProps<typeof Sidebar>> = ({
  ...props
}): JSX.Element => {
  /* Hooks */
  const { sidebarConfig } = useSidebarConfig();

  /* Functions */
  /* Output */
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="space-y-4">
        <SidebarMenu>
          <SidebarMenuItem className="flex flex-row items-center justify-between ">
            <Link
              to={ROOT_PATH}
              className="w-full flex items-center justify-center"
            >
              <img src={AppLogoName} alt="App Logo" className="h-8" />
            </Link>
            <SidebarTrigger />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarConfigRenderer config={sidebarConfig} />
      </SidebarContent>
      <SidebarFooter>
        <CurrentUserInfo />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
