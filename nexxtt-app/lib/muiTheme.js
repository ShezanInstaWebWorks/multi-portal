"use client";

import { createTheme } from "@mui/material/styles";

export const muiTheme = createTheme({
  palette: {
    primary:   { main: "#00B8A9" },
    secondary: { main: "#0B1F3A" },
  },
  typography: {
    fontFamily: "Instrument Sans, sans-serif",
    fontSize: 13,
  },
  components: {
    MuiDataGrid: {
      defaultProps: {
        density: "compact",
        disableRowSelectionOnClick: true,
        autoHeight: true,
      },
      styleOverrides: {
        root: {
          border: "1px solid #E2E6ED",
          borderRadius: 12,
          fontFamily: "Instrument Sans, sans-serif",
          fontSize: "0.82rem",
          boxShadow: "0 1px 4px rgba(11,31,58,0.06)",
          "& .MuiDataGrid-columnHeaders": {
            background: "#F7F8FA",
            color: "#6B7A92",
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 700,
            borderBottom: "1px solid #E2E6ED",
          },
          "& .MuiDataGrid-row": { cursor: "pointer" },
          "& .MuiDataGrid-row:hover": {
            background: "#e6f9f8",
            boxShadow: "inset 3px 0 0 #00B8A9",
          },
          "& .MuiDataGrid-cell": {
            borderColor: "#E2E6ED",
            color: "#374357",
            alignItems: "center",
          },
          "& .MuiDataGrid-footerContainer": { borderColor: "#E2E6ED" },
        },
      },
    },
  },
});
