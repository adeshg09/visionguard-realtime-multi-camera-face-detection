/* Imports */
import type { JSX } from "react";

/* Relative Imports */
import { BrowserRouter as Router } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClientProvider } from "@tanstack/react-query";

/* Local Imports */
import { ThemeContextProvider } from "./context/themeContext";
import { queryClient } from "./lib/queryClient";
import ThemeModeSetting from "./components/themeModeSetting";
import { SessionProvider } from "./context/sessionContext";
import Routing from "./routes";

// ----------------------------------------------------------------------

/**
 * App component to to set all the higher level components and routes.
 *
 * @component
 * @returns {JSX.Element}
 */
const App: React.FC = (): JSX.Element => {
  return (
    <HelmetProvider>
      <ThemeContextProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SessionProvider>
          <ThemeModeSetting />
          <QueryClientProvider client={queryClient}>
            <Router>
              <Routing />
            </Router>
          </QueryClientProvider>
        </SessionProvider>
      </ThemeContextProvider>
    </HelmetProvider>
  );
};

export default App;
