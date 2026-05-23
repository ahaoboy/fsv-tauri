import { useMemo } from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
  useMediaQuery,
  PaletteMode,
} from "@mui/material";
import type { ReactNode } from "react";

/**
 * Get design tokens for both light and dark modes.
 * Mobile-first approach with MUI's default breakpoints.
 */
function getDesignTokens(mode: PaletteMode) {
  return {
    palette: {
      mode,
      ...(mode === "light"
        ? {
          primary: { main: "#3b82f6", dark: "#1d4ed8" },
          secondary: { main: "#10b981" },
          error: { main: "#ef4444" },
          warning: { main: "#f59e0b" },
          background: { default: "#f9fafb", paper: "#ffffff" },
          text: { primary: "#1f2937", secondary: "#6b7280" },
          divider: "#e5e7eb",
        }
        : {
          primary: { main: "#60a5fa", dark: "#3b82f6" },
          secondary: { main: "#34d399" },
          error: { main: "#f87171" },
          warning: { main: "#fbbf24" },
          background: { default: "#111827", paper: "#1f2937" },
          text: { primary: "#f9fafb", secondary: "#9ca3af" },
          divider: "#374151",
        }),
    },
    typography: {
      fontFamily: [
        "-apple-system",
        "BlinkMacSystemFont",
        "'Segoe UI'",
        "Roboto",
        "'Helvetica Neue'",
        "Arial",
        "sans-serif",
      ].join(","),
      fontSize: 14,
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            // Account for Android status bar and notches
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
            // Prevent overscroll bounce on mobile
            overscrollBehavior: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
          },
        },
      },
    },
  };
}

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme provider that automatically switches between light and dark
 * based on the user's system preference (prefers-color-scheme).
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const mode: PaletteMode = prefersDarkMode ? "dark" : "light";

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
