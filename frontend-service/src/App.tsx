/* Imports */
import type { JSX } from "react";

/* Relative Imports */
import { HelmetProvider } from "react-helmet-async";
import { QueryClientProvider } from "@tanstack/react-query";

/* Local Imports */
import { ThemeContextProvider } from "./context/themeContext";
import { queryClient } from "./lib/queryClient";
import ThemeModeSetting from "./components/ThemeModeSetting";

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
        <ThemeModeSetting />
        <QueryClientProvider client={queryClient}>
          <div>Welcome to the VisionGuard App</div>
        </QueryClientProvider>
      </ThemeContextProvider>
    </HelmetProvider>
  );
};

export default App;
