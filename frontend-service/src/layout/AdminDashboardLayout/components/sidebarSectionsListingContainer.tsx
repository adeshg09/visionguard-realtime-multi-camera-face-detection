/* Imports */
import React, { type JSX } from "react";

/* Relative Imports */

/* Local Imports */
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import clsx from "clsx";
import { typography } from "@/theme/typography";
import { Link, useLocation } from "react-router-dom";

// ----------------------------------------------------------------------

/* Interface */

/**
 * Interface used to create sidebar sections listing component for admin dashboard.
 *
 * @interface SidebarSectionsListingContainerProps
 * @property {string} sectionGroupLabel - contains the section group label.
 * @property {Array} sections - contains the sections data.
 *
 */
export interface SidebarSectionsListingContainerProps {
  sectionGroupLabel: string;
  sections: {
    name: string;
    url: string;
    icon: React.ComponentType;
  }[];
}

const SidebarSectionsListingContainer: React.FC<
  SidebarSectionsListingContainerProps
> = ({ sectionGroupLabel, sections }): JSX.Element => {
  /* Hooks */
  const location = useLocation();

  /* Output */
  return (
    <SidebarGroup>
      <SidebarGroupLabel
        className={clsx(typography.medium12, "text-secondary-400")}
      >
        {sectionGroupLabel}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-2">
        {sections.map((section) => {
          const isActive = location.pathname.includes(section.url);
          return (
            <SidebarMenuItem key={section.name}>
              <Link to={section.url}>
                <SidebarMenuButton
                  tooltip={section.name}
                  className={clsx(
                    isActive && "bg-secondary-200 dark:bg-secondary-600"
                  )}
                >
                  {section.icon && <section.icon />}
                  <span
                    className={clsx(
                      typography.medium14,
                      "text-secondary-400 dark:text-secondary-300"
                    )}
                  >
                    {section.name}
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default SidebarSectionsListingContainer;
