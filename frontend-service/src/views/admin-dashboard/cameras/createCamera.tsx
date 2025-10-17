/* Imports */
import { type JSX } from "react";

/* Local Imports */
import AdminDashboardPage from "@/components/page/adminDashboardPage";
// ----------------------------------------------------------------------

const CreateCamera = (): JSX.Element => {
  return (
    <AdminDashboardPage title="Cameras">
      <div>Create Camera</div>
    </AdminDashboardPage>
  );
};

export default CreateCamera;
