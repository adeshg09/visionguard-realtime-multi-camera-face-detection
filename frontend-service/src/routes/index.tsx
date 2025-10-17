/* Imports */
import { Suspense, useContext, type JSX } from "react";
import { useRoutes } from "react-router-dom";

/* Local Imports */
import { RootRoutes, NotFoundRoutes } from "./auth";
import SessionContext from "@/context/sessionContext";
import { SpinnerLoader } from "@/components/loader/inlineLoader";

// ----------------------------------------------------------------------

/**
 * Create routing with the routes
 *
 * @return {JSX.Element}
 */

const Routing: React.FC = (): JSX.Element => {
  //   const { user } = useContext(SessionContext);
  const dashboardRoutes: Array<object> = [];

  const routes = [...RootRoutes, ...dashboardRoutes, ...NotFoundRoutes];

  const content = useRoutes(routes);

  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen flex items-center justify-center">
          <SpinnerLoader />
        </div>
      }
    >
      {content}
    </Suspense>
  );
};

export default Routing;
