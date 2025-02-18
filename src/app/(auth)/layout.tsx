import type { ReactNode } from "react";
import { Providers } from "@/app/_components/providers";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen items-center justify-center bg-background">
        {children}
      </div>
    </Providers>
  );
}
