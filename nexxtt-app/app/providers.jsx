"use client";

import { ThemeProvider } from "@mui/material/styles";
import { muiTheme } from "@/lib/muiTheme";
import { ToastProvider } from "@/components/shared/Toast";

export function Providers({ children }) {
  return (
    <ThemeProvider theme={muiTheme}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
