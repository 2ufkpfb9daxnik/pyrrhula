import type { ReactNode } from "react";
import { Navigation } from "@/app/_components/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation />
      <main className="pb-16 md:ml-16 md:pb-0">{children}</main>
    </div>
  );
}
