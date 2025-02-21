import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./_components/providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className="dark" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 10000,
            style: {
              background: "#333",
              color: "#fff",
              padding: "1rem",
            },
          }}
        />
      </body>
    </html>
  );
}
