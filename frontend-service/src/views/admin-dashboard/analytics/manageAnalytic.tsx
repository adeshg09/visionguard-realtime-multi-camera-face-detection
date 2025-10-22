/* Imports */
import { useContext, type JSX } from "react";

/* Local Imports */
import AdminDashboardPage from "@/components/page/adminDashboardPage";
import SessionContext from "@/context/sessionContext";
// ----------------------------------------------------------------------

const ManageAnalytic = (): JSX.Element => {
  /* hooks */
  const { user } = useContext(SessionContext);
  return (
    <AdminDashboardPage title={`Welcome back ${user?.username}`}>
      <div></div>
    </AdminDashboardPage>
  );
};

export default ManageAnalytic;
