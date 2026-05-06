"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";

import { isMiniPay } from "@/lib/minipay";
import { truncateAddress } from "@/lib/format";

// Non-MiniPay wallet connect path. Hidden inside MiniPay (auto-connect runs
// in providers.tsx). Outside MiniPay this is the only connect surface —
// without it, ~50% of Celo PoS judges (testing in desktop Chrome) can't pay.

export function ConnectWallet() {
  const [inMiniPay, setInMiniPay] = useState<boolean | null>(null);
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: connectPending, error: connectErr } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switchPending } = useSwitchChain();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    setInMiniPay(isMiniPay());
  }, []);

  // Hide entirely inside MiniPay
  if (inMiniPay === null || inMiniPay === true) return null;

  // Wrong chain — surface a one-click switch
  if (isConnected && chainId !== celo.id) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: celo.id })}
        disabled={switchPending}
        className="inline-flex items-center gap-2 rounded-full bg-red-500/15 border border-red-400/40 text-red-200 px-3 py-1.5 text-xs font-mono hover:bg-red-500/25 transition disabled:opacity-50"
      >
        {switchPending ? "Switching…" : "Switch to Celo"}
      </button>
    );
  }

  // Connected on Celo — show truncated-address chip with disconnect
  if (isConnected && address) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-bone/5 border border-bone/15 px-3 py-1 text-[11px] font-mono text-bone/85">
        <span className="size-1.5 rounded-full bg-emerald-400" aria-label="connected" />
        <span>{truncateAddress(address)}</span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="ml-1 text-bone/40 hover:text-bone transition"
          aria-label="disconnect"
        >
          ×
        </button>
      </div>
    );
  }

  // Not connected — Connect button + connector picker
  // Skip injected if window.ethereum is missing (avoids dead "Browser wallet"
  // option in incognito / desktop without MetaMask).
  const visibleConnectors = connectors.filter((c) => {
    if (c.id === "injected") {
      return typeof window !== "undefined" && Boolean((window as { ethereum?: unknown }).ethereum);
    }
    return true;
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-bone text-ink px-3 py-1.5 text-xs font-medium hover:bg-bone/90 transition"
      >
        Connect
      </button>

      {open && (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 z-50 min-w-[200px] rounded-2xl border border-bone/15 bg-ink/95 backdrop-blur p-1 shadow-2xl"
          >
            {visibleConnectors.length === 0 ? (
              <p className="text-[11px] font-mono text-bone/55 px-3 py-2 leading-snug">
                No browser wallet found. Tap Open in MiniPay above, or install a wallet that supports WalletConnect.
              </p>
            ) : (
              visibleConnectors.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  disabled={connectPending}
                  onClick={() => {
                    connect({ connector: c });
                    setOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-xl text-sm font-mono text-bone/85 hover:bg-bone/10 transition disabled:opacity-50"
                >
                  {labelFor(c.id, c.name)}
                </button>
              ))
            )}
            {connectErr && (
              <p className="text-[11px] font-mono text-red-300/90 px-3 py-2 leading-snug" role="alert">
                {connectErr.message}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function labelFor(id: string, fallback: string): string {
  if (id === "walletConnect") return "WalletConnect (QR)";
  if (id === "injected") return "Browser wallet";
  return fallback;
}
