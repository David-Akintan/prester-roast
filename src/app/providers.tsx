"use client";

import { useEffect, useRef, useState } from "react";
import { WagmiProvider, useConnect } from "wagmi";
import { reconnect } from "@wagmi/core";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { isMiniPay } from "@/lib/minipay";

// Restores the wallet on every mount:
//  · Inside MiniPay → injected() (idempotent; MiniPay always exposes one wallet)
//  · Outside MiniPay → reconnect() rehydrates whichever connector the user
//    previously chose, using wagmi's persisted localStorage state. Without
//    this, refreshing a non-MiniPay browser leaves wagmi in a "(connected)"
//    zombie state with no live provider underneath.
function WalletReconnect({ children }: { children: React.ReactNode }) {
  const { connect } = useConnect();
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (isMiniPay()) {
      connect({ connector: injected() });
    } else {
      reconnect(config).catch(() => {
        // No prior session or user-rejected — silently fall back to the
        // Connect button. Logging would be noise.
      });
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
        <WalletReconnect>{children}</WalletReconnect>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
