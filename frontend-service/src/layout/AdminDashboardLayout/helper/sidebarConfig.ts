import { PAGE_ADMIN_DASHBOARD } from "@/routes/paths";
import { BarChart3, Camera } from "lucide-react";

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
