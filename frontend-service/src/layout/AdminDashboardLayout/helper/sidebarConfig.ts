/* Relative Imports */
import { BarChart3, Camera } from "lucide-react";

/* Local Imports */
import { PAGE_ADMIN_DASHBOARD } from "@/routes/paths";

// ----------------------------------------------------------------------

/* Constants */
export const adminSidebarConfig = [
  {
    sectionGroupLabel: "Dashboard",
    sections: [
      {
        name: "Analytics",
        url: PAGE_ADMIN_DASHBOARD.analytics.absolutePath,
        icon: BarChart3,
      },
    ],
  },
  {
    sectionGroupLabel: "Management",
    sections: [
      {
        name: "Cameras",
        url: PAGE_ADMIN_DASHBOARD.cameras.absolutePath,
        icon: Camera,
      },
    ],
  },
];
