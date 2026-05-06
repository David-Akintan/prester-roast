"use client";

import { useEffect, useState } from "react";
import { WagmiProvider, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { isMiniPay } from "@/lib/minipay";

function MiniPayAutoConnect({ children }: { children: React.ReactNode }) {
  const { connect } = useConnect();
  useEffect(() => {
    if (isMiniPay()) {
      connect({ connector: injected() });
    }
  }, [connect]);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Stable QueryClient across re-renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniPayAutoConnect>{children}</MiniPayAutoConnect>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
