"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";
import { createQueryClient, GC_TIME_MS } from "@/lib/query-client";
import { createQueryPersister } from "@/lib/query-persister";
import { useAppTheme } from "@/app/_hooks/useAppTheme";

function AppThemeInitializer({ children }: { children: React.ReactNode }) {
  useAppTheme();
  return children;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const persister = createQueryPersister();

  const content = (
    <AppThemeInitializer>
      <TooltipProvider>{children}</TooltipProvider>
    </AppThemeInitializer>
  );

  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      refetchInterval={0}
    >
      {persister ? (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: GC_TIME_MS,
            dehydrateOptions: {
              shouldDehydrateQuery: (query) =>
                query.state.status === "success",
            },
          }}
        >
          {content}
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
      )}
    </SessionProvider>
  );
}
