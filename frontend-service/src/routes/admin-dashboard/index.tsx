/* Imports */
import { lazy } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { PAGE_ADMIN_DASHBOARD } from "../paths";
import AdminDashboardLayout from "@/layout/AdminDashboardLayout";
import AuthGuard from "../guards/authGuard";

/* Local Imports */

// ----------------------------------------------------------------------

/* Admin Dashboard Module Imports */

const ManageAnalyticPage = lazy(
  () => import("@/views/admin-dashboard/analytics/manageAnalytic")
);

const ManageCameraPage = lazy(
  () => import("@/views/admin-dashboard/cameras/manageCamera")
);

const CreateCameraPage = lazy(
  () => import("@/views/admin-dashboard/cameras/createCamera")
);
// ----------------------------------------------------------------------

/* Functions */
/**
 * function to fetch routes
 * @returns {void}
 */

const getAdminDashboardRoutes = (): Array<object> => {
  let dashboardRoutes: Array<object> = [
    {
      path: PAGE_ADMIN_DASHBOARD.root.relativePath,
      element: (
        <AuthGuard>
          <AdminDashboardLayout>
            <></>
          </AdminDashboardLayout>
        </AuthGuard>
      ),
    },
  ];

  dashboardRoutes = [
    {
      path: PAGE_ADMIN_DASHBOARD.root.relativePath,
      element: (
        <AuthGuard>
          <AdminDashboardLayout>
            <Outlet />
          </AdminDashboardLayout>
        </AuthGuard>
      ),
      children: [
        {
          index: true,
          element: (
            <Navigate to={PAGE_ADMIN_DASHBOARD.analytics.relativePath} />
          ),
        },
        {
          path: PAGE_ADMIN_DASHBOARD.analytics.relativePath,
          element: <ManageAnalyticPage />,
        },
        {
          path: PAGE_ADMIN_DASHBOARD.cameras.relativePath,
          children: [
            {
              index: true,
              element: <ManageCameraPage />,
            },
            {
              path: PAGE_ADMIN_DASHBOARD.cameras.create.relativePath,
              element: <CreateCameraPage />,
            },
            {
              path: PAGE_ADMIN_DASHBOARD.cameras.edit.relativePath,
              element: <CreateCameraPage />,
            },
          ],
        },
      ],
    },
  ];

  return dashboardRoutes;
};

export default getAdminDashboardRoutes;
