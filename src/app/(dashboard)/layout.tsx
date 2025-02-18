import type { ReactNode } from "react";
import { Navigation } from "@/app/_components/navigation";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="ml-16 flex-1">{children}</div>
    </div>
  );
}
