/* Imports */
import React, { type JSX } from "react";

/* Local Imports */
import SidebarSectionsListingContainer from "./sidebarSectionsListingContainer";

// ----------------------------------------------------------------------

/* Interface */

/**
 * Interface for the nested sidebar config structure
 */
export interface SidebarConfigSection {
  sectionGroupLabel: string;
  sections: {
    name: string;
    url: string;
    icon: React.ComponentType;
  }[];
}

export interface SidebarConfigRendererProps {
  config: SidebarConfigSection[];
}

// ----------------------------------------------------------------------

/**
 * Component to render the complete sidebar configuration
 *
 * @component
 * @param {SidebarConfigSection[]} config - The sidebar configuration array
 * @returns {JSX.Element}
 */
const SidebarConfigRenderer: React.FC<SidebarConfigRendererProps> = ({
  config,
}): JSX.Element => {
  return (
    <>
      {config.map((sectionGroup, index) => (
        <React.Fragment key={`${sectionGroup.sectionGroupLabel}-${index}`}>
          <SidebarSectionsListingContainer
            sectionGroupLabel={sectionGroup.sectionGroupLabel}
            sections={sectionGroup.sections}
          />
          {/* Add separator after each group except the last one */}
          {/* {index < config.length - 1 && <Separator className="my-2" />} */}
        </React.Fragment>
      ))}
    </>
  );
};

export default SidebarConfigRenderer;
