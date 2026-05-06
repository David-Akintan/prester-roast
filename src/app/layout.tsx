"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import "./globals.css";

const queryClient = new QueryClient();

function AutoConnect({ children }: { children: React.ReactNode }) {
  const { connect } = useConnect();

  useEffect(() => {
    // MiniPay auto-connect: if isMiniPay, skip the connect button entirely
    if (typeof window !== "undefined" && (window as any).ethereum?.isMiniPay) {
      connect({ connector: injected() });
    }
  }, [connect]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <title>Roast Court</title>
      </head>
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <AutoConnect>{children}</AutoConnect>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
