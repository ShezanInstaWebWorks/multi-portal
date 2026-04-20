"use client";

import { ThemeProvider } from "@mui/material/styles";
import { muiTheme } from "@/lib/muiTheme";

export function Providers({ children }) {
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
