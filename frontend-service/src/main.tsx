/* Imports */
import ReactDOM from "react-dom/client";

/* Local Imports */
import App from "./App.tsx";
import "./assets/fonts/index.css";
import "./index.css";

// ----------------------------------------------------------------------
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);
