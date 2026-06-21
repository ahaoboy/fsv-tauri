import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./theme";
import App from "./App";

/**
 * Application entry point.
 * Wraps the app with MUI ThemeProvider for automatic light/dark theming
 * and React StrictMode for development best practices.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
