"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPublicClient } from "@wagmi/core";
import { formatUnits, parseUnits } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { celo } from "wagmi/chains";

import { ConnectWallet } from "@/components/ConnectWallet";
import { OpenInMiniPayButton } from "@/components/OpenInMiniPayButton";
import { CUSD_ADDRESS, ERC20_ABI } from "@/lib/contract";
import { getFeeCurrency } from "@/lib/minipay";
import { utcDayIndex } from "@/lib/topics";
import { config as wagmiConfig } from "@/lib/wagmi";

const ROAST_POT_ADDRESS = (process.env.NEXT_PUBLIC_ROAST_POT_ADDRESS ??
  "0xdCAcb893EbaA8B1B1D839353346dCdF556836B02") as `0x${string}`;

const CUSD_DECIMALS = 18;
const APPROVAL_FLOOR = parseUnits("1000", CUSD_DECIMALS);

const roastPotAbi = [
  {
    name: "potByDay",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint64", name: "utcDay" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "settled",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint64", name: "utcDay" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "fund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "uint64", name: "utcDay" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [],
  },
] as const;

type TxPhase = "idle" | "approving" | "funding" | "success" | "error";

function parseCusdInput(input: string): {
  amount: bigint;
  error: string | null;
} {
  const trimmed = input.trim();

  if (!trimmed) return { amount: 0n, error: "Enter an amount." };

  const normalized = trimmed.startsWith(".") ? `0${trimmed}` : trimmed;
  const readyForParse = normalized.endsWith(".")
    ? `${normalized}0`
    : normalized;

  if (!/^\d+(?:\.\d{0,18})?$/.test(readyForParse)) {
    return { amount: 0n, error: "Use up to 18 decimal places." };
  }

  try {
    const amount = parseUnits(readyForParse, CUSD_DECIMALS);
    if (amount <= 0n)
      return { amount, error: "Amount must be greater than 0." };
    return { amount, error: null };
  } catch {
    return { amount: 0n, error: "Enter a valid cUSD amount." };
  }
}

function formatCusd(amount: bigint | undefined, maxDecimals = 4) {
  if (amount === undefined) return "--";
  const [whole, fraction = ""] = formatUnits(amount, CUSD_DECIMALS).split(".");
  const trimmed = fraction.slice(0, maxDecimals).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

function shortAddress(address: `0x${string}` | string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUtcTimeLeft(now: Date) {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  const msLeft = Math.max(0, nextMidnight - now.getTime());
  const hours = Math.floor(msLeft / 3_600_000);
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export default function PotPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: switchPending } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [now, setNow] = useState(() => new Date());
  const [fundAmountInput, setFundAmountInput] = useState("0.1");
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = useMemo(() => BigInt(utcDayIndex(now)), [now]);
  const utcDate = now.toISOString().slice(0, 10);
  const utcTimeLeft = formatUtcTimeLeft(now);
  const { amount: fundAmount, error: amountError } = useMemo(
    () => parseCusdInput(fundAmountInput),
    [fundAmountInput],
  );

  const potQuery = useReadContract({
    address: ROAST_POT_ADDRESS,
    abi: roastPotAbi,
    functionName: "potByDay",
    args: [today],
  });

  const settledQuery = useReadContract({
    address: ROAST_POT_ADDRESS,
    abi: roastPotAbi,
    functionName: "settled",
    args: [today],
  });

  const pausedQuery = useReadContract({
    address: ROAST_POT_ADDRESS,
    abi: roastPotAbi,
    functionName: "paused",
  });

  const contractBalanceQuery = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [ROAST_POT_ADDRESS],
  });

  const walletBalanceQuery = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const allowanceQuery = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ROAST_POT_ADDRESS] : undefined,
    query: { enabled: Boolean(address) },
  });

  const todayPot = potQuery.data ?? 0n;
  const contractBalance = contractBalanceQuery.data ?? 0n;
  const walletBalance = walletBalanceQuery.data;
  const allowance = allowanceQuery.data ?? 0n;
  const isWrongChain = isConnected && chainId !== celo.id;
  const isBusy = phase === "approving" || phase === "funding" || switchPending;
  const hasEnoughAllowance = allowance >= fundAmount;
  const hasEnoughBalance =
    !isConnected || walletBalance === undefined || walletBalance >= fundAmount;
  const isSettled = Boolean(settledQuery.data);
  const isPaused = Boolean(pausedQuery.data);

  const refreshReads = useCallback(async () => {
    await Promise.all([
      potQuery.refetch(),
      contractBalanceQuery.refetch(),
      walletBalanceQuery.refetch(),
      allowanceQuery.refetch(),
      settledQuery.refetch(),
      pausedQuery.refetch(),
    ]);
  }, [
    allowanceQuery,
    contractBalanceQuery,
    pausedQuery,
    potQuery,
    settledQuery,
    walletBalanceQuery,
  ]);

  const handleAmountChange = (value: string) => {
    if (/^[0-9.]*$/.test(value)) {
      setFundAmountInput(value);
      if (phase === "error" || phase === "success") {
        setPhase("idle");
        setStatus(null);
      }
    }
  };

  const handleSwitchChain = useCallback(() => {
    switchChain({ chainId: celo.id });
  }, [switchChain]);

  const handleFund = useCallback(async () => {
    if (!address) {
      setPhase("error");
      setStatus("Connect your wallet first.");
      return;
    }

    if (amountError) {
      setPhase("error");
      setStatus(amountError);
      return;
    }

    if (isWrongChain) {
      handleSwitchChain();
      return;
    }

    if (isPaused) {
      setPhase("error");
      setStatus("RoastPot is paused right now.");
      return;
    }

    if (isSettled) {
      setPhase("error");
      setStatus(
        "Today's pot has already settled. Funding reopens after UTC reset.",
      );
      return;
    }

    if (walletBalance !== undefined && walletBalance < fundAmount) {
      setPhase("error");
      setStatus(`Your balance is ${formatCusd(walletBalance)} cUSD.`);
      return;
    }

    const publicClient = getPublicClient(wagmiConfig);
    if (!publicClient) {
      setPhase("error");
      setStatus("No Celo RPC client is available.");
      return;
    }

    const feeCurrency = getFeeCurrency();

    try {
      if (allowance < fundAmount) {
        setPhase("approving");
        setStatus("Approve cUSD spending in your wallet.");
        const approveAmount =
          fundAmount > APPROVAL_FLOOR ? fundAmount : APPROVAL_FLOOR;
        const approveHash = await writeContractAsync({
          address: CUSD_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ROAST_POT_ADDRESS, approveAmount],
          feeCurrency,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await allowanceQuery.refetch();
      }

      setPhase("funding");
      setStatus("Funding today's RoastPot.");
      const fundHash = await writeContractAsync({
        address: ROAST_POT_ADDRESS,
        abi: roastPotAbi,
        functionName: "fund",
        args: [today, fundAmount],
        feeCurrency,
      });
      await publicClient.waitForTransactionReceipt({ hash: fundHash });

      setPhase("success");
      setStatus(`Added ${formatCusd(fundAmount)} cUSD to today's pot.`);
      await refreshReads();
    } catch (error) {
      const message =
        error instanceof Error &&
        /user rejected|user denied/i.test(error.message)
          ? "You cancelled the transaction."
          : error instanceof Error
            ? error.message
            : "Transaction failed.";
      setPhase("error");
      setStatus(message);
    }
  }, [
    address,
    allowance,
    allowanceQuery,
    amountError,
    fundAmount,
    handleSwitchChain,
    isPaused,
    isSettled,
    isWrongChain,
    refreshReads,
    today,
    walletBalance,
    writeContractAsync,
  ]);

  const primaryLabel = !isConnected
    ? "Connect Wallet"
    : isWrongChain
      ? "Switch to Celo"
      : amountError
        ? "Enter Amount"
        : isSettled
          ? "Settled Today"
          : isPaused
            ? "Paused"
            : isBusy
              ? phase === "approving"
                ? "Approving..."
                : "Funding..."
              : hasEnoughAllowance
                ? "Fund Pot"
                : "Approve and Fund";

  const primaryDisabled =
    isBusy ||
    !isConnected ||
    Boolean(amountError) ||
    isPaused ||
    isSettled ||
    !hasEnoughBalance;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10 space-y-6 fade-in-up">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <Link
          href="/"
          className="min-w-0 hover:text-[var(--color-text-primary)]"
        >
          <div className="flex items-baseline gap-2">
            <span aria-hidden className="text-xl leading-none">
              RC
            </span>
            <h1 className="font-display text-3xl tracking-tight leading-none text-[var(--color-text-primary)]">
              Roast Pot
            </h1>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)] mt-2">
            Daily cUSD prize pool
          </p>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <ConnectWallet />
          <OpenInMiniPayButton />
          <Link
            href="/"
            className="lift inline-flex min-h-[32px] items-center rounded-none border-2 border-[#262626] bg-[#161618] px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] text-bone/85 hover:border-ember/60"
          >
            Back
          </Link>
        </div>
      </header>

      <section className="border-2 border-[var(--color-surface-2)] bg-[var(--color-surface-1)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-yellow-400">
              UTC day {today.toString()} / {utcDate}
            </p>
            <h2 className="mt-3 font-display text-5xl sm:text-7xl leading-none text-[var(--color-text-primary)]">
              {potQuery.isLoading ? "--" : formatCusd(contractBalance)}
              <span className="ml-2 align-baseline font-mono text-base sm:text-xl text-[var(--color-text-secondary)]">
                cUSD
              </span>
            </h2>

            <div className="text-left sm:text-right font-mono text-xs text-[var(--color-text-secondary)]">
              <p className="uppercase tracking-[0.18em]">Resets in</p>
              <p className="mt-1 text-lg text-[var(--color-text-primary)]">
                {utcTimeLeft}
              </p>
              <p className="mt-2">
                {isSettled ? "Settled" : isPaused ? "Paused" : "Open"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border border-[var(--color-surface-2)] bg-[#101011] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            Daily accounting
          </p>
          <p className="mt-2 text-lg font-mono text-[var(--color-text-primary)]">
            {formatCusd(contractBalance)} cUSD
          </p>
        </div>
        <div className="border border-[var(--color-surface-2)] bg-[#101011] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            Contract balance
          </p>
          <p className="mt-2 text-lg font-mono text-[var(--color-text-primary)]">
            {formatCusd(contractBalance)} cUSD
          </p>
        </div>
        <div className="border border-[var(--color-surface-2)] bg-[#101011] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            Your cUSD
          </p>
          <p className="mt-2 text-lg font-mono text-[var(--color-text-primary)]">
            {isConnected
              ? `${formatCusd(walletBalance)} cUSD`
              : "Not connected"}
          </p>
        </div>
      </section>

      <section className="border-2 border-[var(--color-surface-2)] bg-[var(--color-surface-1)] p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl leading-none">Fund the pot</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Adds cUSD to today's on-chain potByDay entry.
            </p>
          </div>
          {address && (
            <p className="font-mono text-xs text-[var(--color-text-secondary)]">
              {shortAddress(address)}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="sr-only">Amount in cUSD</span>
            <div className="flex min-h-[58px] items-center border-2 border-[#262626] bg-black focus-within:border-yellow-400">
              <input
                inputMode="decimal"
                value={fundAmountInput}
                onChange={(event) => handleAmountChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-2xl outline-none"
                placeholder="0.1"
                aria-invalid={Boolean(amountError)}
              />
              <span className="px-4 font-mono text-sm uppercase tracking-[0.15em] text-[var(--color-text-secondary)]">
                cUSD
              </span>
            </div>
          </label>

          <button
            type="button"
            onClick={isWrongChain ? handleSwitchChain : handleFund}
            disabled={primaryDisabled && !isWrongChain}
            className="depress min-h-[58px] border border-yellow-500 bg-yellow-400 px-5 font-display text-lg uppercase tracking-[0.08em] text-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {primaryLabel}
          </button>
        </div>

        <div className="min-h-[44px] font-mono text-xs leading-relaxed text-[var(--color-text-secondary)]">
          {amountError ? (
            <p className="text-red-300">{amountError}</p>
          ) : !hasEnoughBalance ? (
            <p className="text-red-300">
              Not enough cUSD. Wallet balance: {formatCusd(walletBalance)} cUSD.
            </p>
          ) : hasEnoughAllowance ? (
            <p>Allowance ready for this amount.</p>
          ) : (
            <p>
              First transaction approves cUSD, second transaction funds the pot.
            </p>
          )}

          {status && (
            <p
              role={phase === "error" ? "alert" : "status"}
              className={[
                "mt-2 border px-3 py-2",
                phase === "error"
                  ? "border-red-500/60 bg-red-500/10 text-red-300"
                  : phase === "success"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                    : "border-yellow-400/50 bg-yellow-400/10 text-yellow-200",
              ].join(" ")}
            >
              {status}
            </p>
          )}
        </div>
      </section>

      <section className="border border-[var(--color-surface-2)] bg-[#101011] p-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-yellow-400">
          How it works
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <p>
            Paid roasts and community funding increase the daily cUSD prize
            pool.
          </p>
          <p>
            The app reads potByDay for the active UTC day, not the whole wallet
            balance.
          </p>
          <p>
            The winner is awarded by the treasury flow after the UTC day closes.
          </p>
        </div>
      </section>

      <footer className="pt-4 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-secondary)]">
        RoastPot {shortAddress(ROAST_POT_ADDRESS)} / Celo mainnet
      </footer>
    </main>
  );
}
