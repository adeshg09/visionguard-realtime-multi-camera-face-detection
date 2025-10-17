/* Imports */
import { type JSX } from "react";

/* Local Imports */
import AdminDashboardPage from "@/components/page/adminDashboardPage";
// ----------------------------------------------------------------------

const ManageCamera = (): JSX.Element => {
  return (
    <AdminDashboardPage title="Cameras">
      <div>Manage Cameras</div>
    </AdminDashboardPage>
  );
};

export default ManageCamera;
