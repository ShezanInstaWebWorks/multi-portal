"use client";

import { DataGrid } from "@mui/x-data-grid";
import { MobileTableCard } from "./MobileTableCard";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function ResponsiveTable({
  rows,
  columns,
  mobileCardProps,
  onRowClick,
  ...props
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <MobileTableCard
            key={row.id}
            onClick={() => onRowClick?.(row)}
            {...(mobileCardProps ? mobileCardProps(row) : {})}
          />
        ))}
      </div>
    );
  }

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      onRowClick={({ row }) => onRowClick?.(row)}
      pageSizeOptions={[10, 25, 50]}
      initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
      {...props}
    />
  );
}
