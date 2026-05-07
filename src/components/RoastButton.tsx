"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { getPublicClient, readContract } from "@wagmi/core";
import { decodeEventLog, type TransactionReceipt } from "viem";

import {
  CUSD_ADDRESS,
  ERC20_ABI,
  PERSONA_INDEX,
  ROAST_COURT_ABI,
  ROAST_COURT_ADDRESS,
  ROAST_PRICE_WEI,
  type Persona,
} from "@/lib/contract";
import { config as wagmiConfig } from "@/lib/wagmi";
import { getFeeCurrency } from "@/lib/minipay";
import { formatPriceLabel } from "@/lib/format";

type Phase = "idle" | "judging" | "approving" | "roasting" | "done" | "error";

interface RoastApiResponse {
  roast: string;
  severity: number;
  persona: Persona;
  isFree: boolean;
  roastTextHash: `0x${string}`;
  inputHash: `0x${string}`;
  judgeSig: `0x${string}`;
  ipfsCid: string | null;
  dailyTopic: string | null;
}

export interface RoastSuccess {
  verdictId: bigint;
  api: RoastApiResponse;
  receipt: TransactionReceipt;
}

export function RoastButton({
  persona,
  userInput,
  isFree,
  disabled,
  onSuccess,
  onError,
}: {
  persona: Persona;
  userInput: string;
  isFree: boolean;
  disabled?: boolean;
  onSuccess: (s: RoastSuccess) => void;
  onError?: (msg: string) => void;
}) {
  const { address } = useAccount();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  const fail = useCallback(
    (msg: string) => {
      setErrMsg(msg);
      setPhase("error");
      onError?.(msg);
    },
    [onError],
  );

  const handleClick = useCallback(async () => {
    if (!address) return fail("Connect a wallet first.");
    if (disabled) return;

    setErrMsg(null);
    setPhase("judging");

    // 1. Judge call: get verdict text + judge signature
    let api: RoastApiResponse;
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, persona, userInput, isFree }),
      });
      const json = await res.json();
      if (!res.ok) {
        // /api/roast returns { error, attempts? } when judges fail.
        // Surface the per-provider error class so users (and us during demo)
        // get actionable info instead of "Judge offline".
        const attempts = json.attempts as Array<{ provider: string; error: string }> | undefined;
        const detail = attempts?.length
          ? `\n${attempts.map((a) => `· ${a.provider}: ${a.error}`).join("\n")}`
          : "";
        return fail(`${json.error ?? `Judge offline (${res.status})`}${detail}`);
      }
      api = json as RoastApiResponse;
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Network error reaching judge.");
    }

    const publicClient = getPublicClient(wagmiConfig);
    if (!publicClient) return fail("No RPC client available.");

    const feeCurrency = getFeeCurrency();

    try {
      // 2. (Paid) approve cUSD if allowance is short
      if (!isFree) {
        const allowance = (await readContract(wagmiConfig, {
          address: CUSD_ADDRESS,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, ROAST_COURT_ADDRESS],
        })) as bigint;

        if (allowance < ROAST_PRICE_WEI) {
          setPhase("approving");
          const approveHash = await writeContractAsync({
            address: CUSD_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [ROAST_COURT_ADDRESS, ROAST_PRICE_WEI],
            feeCurrency,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      // 3. Issue or claim — both same shape
      setPhase("roasting");
      const fnName = isFree ? "claimFreeRoast" : "issueVerdict";
      const txHash = await writeContractAsync({
        address: ROAST_COURT_ADDRESS,
        abi: ROAST_COURT_ABI,
        functionName: fnName,
        args: [PERSONA_INDEX[persona], api.roastTextHash, api.inputHash, api.judgeSig],
        feeCurrency,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // 4. Pull verdict id from RoastIssued event
      let verdictId: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ROAST_COURT_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "RoastIssued") {
            verdictId = decoded.args.id;
            break;
          }
        } catch {
          // log not from our contract — skip
        }
      }
      if (verdictId === null) return fail("Verdict id missing from receipt.");

      setPhase("done");
      onSuccess({ verdictId, api, receipt });
    } catch (e) {
      const msg =
        e instanceof Error && /user rejected|user denied/i.test(e.message)
          ? "You cancelled the transaction."
          : e instanceof Error
            ? e.message
            : "Transaction failed.";
      fail(msg);
    }
  }, [address, disabled, fail, isFree, onSuccess, persona, userInput, writeContractAsync]);

  const label = (() => {
    switch (phase) {
      case "judging":
        return "Summoning the judge…";
      case "approving":
        return "Approving cUSD…";
      case "roasting":
        return "Sealing verdict onchain…";
      case "done":
        return "Verdict in — opening…";
      case "error":
        return "Try again";
      default:
        return isFree ? "Claim free roast" : `Get roasted · ${formatPriceLabel(ROAST_PRICE_WEI)}`;
    }
  })();

  const busy = phase !== "idle" && phase !== "error";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={Boolean(disabled) || busy || !address}
        className={[
          "lift w-full min-h-[56px] rounded-none px-5 py-3 font-display text-lg border-2",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b]",
          isFree
            ? "border-ember bg-gradient-to-b from-ember to-ember-deep text-ink hover:from-[#ff7355] hover:to-ember shadow-[0_8px_24px_-4px_rgba(255,87,51,0.5)]"
            : "border-bone bg-gradient-to-b from-bone to-[#d6cfc3] text-ink hover:from-white hover:to-bone shadow-[0_8px_24px_-4px_rgba(245,239,231,0.25)]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        ].join(" ")}
      >
        <span className="inline-flex items-center justify-center gap-2.5">
          {busy && <span className="spinner" aria-hidden />}
          <span>{label}</span>
        </span>
      </button>
      {phase === "error" && errMsg && (
        <p
          className="text-sm text-red-300 font-mono leading-snug px-3 py-2 rounded-none border-2 border-red-500/60 bg-red-500/10 whitespace-pre-line"
          role="alert"
        >
          {errMsg}
        </p>
      )}
    </div>
  );
}
