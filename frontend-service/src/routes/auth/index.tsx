/* Imports */
import { lazy } from "react";

/* Local Imports */
import AuthLayout from "@/layout/AuthLayout";
import UserGuard from "../guards/userGuard";
import { ROOT_PATH, PAGE_ROOT } from "../paths";

// ----------------------------------------------------------------------

/* Auth Module Imports */
const LogInPage = lazy(() => import("@/views/auth/login"));

const NotFoundPage = lazy(() => import("@/views/page-not-found"));

// ----------------------------------------------------------------------

/**
 * assign components to routes
 *
 * @return {array}
 */
const RootRoutes: Array<object> = [
  {
    path: ROOT_PATH,
    element: (
      <UserGuard>
        <AuthLayout>
          <LogInPage />
        </AuthLayout>
      </UserGuard>
    ),
  },
  {
    path: PAGE_ROOT.login.relativePath,
    element: (
      <UserGuard>
        <AuthLayout>
          <LogInPage />
        </AuthLayout>
      </UserGuard>
    ),
  },
];

/**
 * assign component to no found routes
 *
 * @return {array}
 */
const NotFoundRoutes: Array<object> = [
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export { RootRoutes, NotFoundRoutes };
