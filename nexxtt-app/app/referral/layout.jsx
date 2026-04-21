import { CommandPalette } from "@/components/search/CommandPalette";

export default function RefLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-off">
      {children}
      <CommandPalette />
    </div>
  );
}
