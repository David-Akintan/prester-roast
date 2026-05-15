"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { celo } from "wagmi/chains";

import { isMiniPay } from "@/lib/minipay";
import { truncateAddress } from "@/lib/format";

// Non-MiniPay wallet connect path. Hidden inside MiniPay (auto-connect runs
// in providers.tsx). Outside MiniPay this is the only connect surface —
// without it, ~50% of Celo PoS judges (testing in desktop Chrome) can't pay.

export function ConnectWallet() {
  const [inMiniPay, setInMiniPay] = useState<boolean | null>(null);
  const { address, isConnected } = useAccount();
  const {
    connectors,
    connect,
    isPending: connectPending,
    error: connectErr,
  } = useConnect();
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
        className="lift inline-flex items-center gap-2 rounded-none border-2 border-red-400/70 bg-red-500/15 text-red-200 px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] hover:bg-red-500/25 disabled:opacity-50"
      >
        {switchPending ? "Switching…" : "Switch to Celo"}
      </button>
    );
  }

  // Connected on Celo — show truncated-address chip with disconnect
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-1.5 bg-surface-1 border border-surface-2 rounded-3xl px-4 py-1 text-sm font-mono">
        <span className="w-2 h-2 bg-emerald-400 rounded-full" />
        <span className="text-text-primary font-medium">
          {truncateAddress(address)}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="ml-1 text-text-secondary hover:text-text-primary transition-colors text-lg leading-none"
          aria-label="disconnect"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="lift inline-flex items-center gap-2 rounded-3xl border border-surface-2 bg-surface-1 hover:bg-white hover:text-black px-5 py-2 text-x font-mono uppercase tracking-[0.15em] text-text-primary transition-all"
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
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] rounded-3xl border border-surface-2 bg-surface-1 p-1 shadow-2xl">
            {connectors.map((c) => (
              <button
                key={c.uid}
                type="button"
                disabled={connectPending}
                onClick={() => {
                  connect({ connector: c });
                  setOpen(false);
                }}
                className="block w-full text-left px-4 py-3 rounded-2xl text-sm font-medium hover:bg-surface-2 transition"
              >
                {c.name}
              </button>
            ))}
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
