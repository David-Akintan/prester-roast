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
      if (!res.ok) return fail(json.error ?? `Judge offline (${res.status})`);
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
        return "Calling the judge…";
      case "approving":
        return "Approving cUSD…";
      case "roasting":
        return "Sealing verdict…";
      case "done":
        return "Done — opening…";
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
          "w-full min-h-[56px] rounded-2xl px-5 py-3 font-display text-lg",
          "transition active:translate-y-px",
          isFree ? "bg-ember text-ink hover:bg-ember/90" : "bg-bone text-ink hover:bg-bone/90",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        {busy && <span className="inline-block mr-2 align-middle animate-pulse">●</span>}
        {label}
      </button>
      {phase === "error" && errMsg && (
        <p className="text-sm text-red-300/90 font-mono leading-snug" role="alert">
          {errMsg}
        </p>
      )}
    </div>
  );
}
