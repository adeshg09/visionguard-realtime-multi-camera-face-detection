/* Constants */
const ROOT_PATH = "/";
const ROOT_ADMIN_DASHBOARD = "admin-dashboard";

/* Home Page */
export { ROOT_PATH };

/* Root Pages */
export const PAGE_ROOT = {
  login: {
    relativePath: "login",
    absolutePath: "/login",
  },
  notFound: {
    relativePath: "not-found",
    absolutePath: "/not-found",
  },
  notAllowed: {
    relativePath: "not-allowed",
    absolutePath: "/not-allowed",
  },
};

/* Admin Dashboard Pages */
export const PAGE_ADMIN_DASHBOARD = {
  root: {
    relativePath: ROOT_ADMIN_DASHBOARD,
    absolutePath: `/${ROOT_ADMIN_DASHBOARD}`,
  },
  account: {
    relativePath: "account",
    absolutePath: `/${ROOT_ADMIN_DASHBOARD}/account`,
  },
  analytics: {
    relativePath: "analytics",
    absolutePath: `/${ROOT_ADMIN_DASHBOARD}/analytics`,
  },
  cameras: {
    relativePath: "cameras",
    absolutePath: `/${ROOT_ADMIN_DASHBOARD}/cameras`,
    create: {
      relativePath: "create",
      absolutePath: `/${ROOT_ADMIN_DASHBOARD}/cameras/create`,
    },
    edit: {
      relativePath: "edit/:id",
      absolutePath: `/${ROOT_ADMIN_DASHBOARD}/cameras/edit/:id`,
    },
  },
};
