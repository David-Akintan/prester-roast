"use client";

import { useState, useCallback } from "react";
import { useAccount, useConnect, useSignMessage, useWriteContract } from "wagmi";
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
import { buildRoastRequestMessage } from "@/lib/roast-auth";
import { utcDayIndex } from "@/lib/topics";
import { CourtroomOverlay, type OverlayPhase } from "@/components/CourtroomOverlay";

type Phase =
  | "idle"
  | "signing"
  | "judging"
  | "approving"
  | "roasting"
  | "done"
  | "error";

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
  const { connectors, connect, isPending: connectPending } = useConnect();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const fail = useCallback(
    (msg: string) => {
      setErrMsg(msg);
      setPhase("error");
      onError?.(msg);
    },
    [onError],
  );

  const connectWallet = useCallback(() => {
    const injected = connectors.find((c) => c.id === "injected");
    const target = injected ?? connectors[0];
    if (!target) return fail("No wallet connector available.");
    connect({ connector: target });
  }, [connect, connectors, fail]);

  const handleClick = useCallback(async () => {
    if (!address) return connectWallet();
    if (disabled) return;

    setErrMsg(null);

    let api: RoastApiResponse;
    try {
      const utcDay = utcDayIndex();
      const canonicalInput = userInput.trim();
      const requestMessage = buildRoastRequestMessage({
        wallet: address,
        persona,
        userInput: canonicalInput,
        isFree,
        utcDay,
      });
      setPhase("signing");
      const requestSig = await signMessageAsync({ message: requestMessage });
      setPhase("judging");

      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          persona,
          userInput: canonicalInput,
          isFree,
          utcDay,
          requestSig,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const attempts = json.attempts as Array<{ provider: string; error: string }> | undefined;
        const detail = attempts?.length
          ? `\n${attempts.map((a) => `· ${a.provider}: ${a.error}`).join("\n")}`
          : "";
        return fail(`${json.error ?? `Judge offline (${res.status})`}${detail}`);
      }
      api = json as RoastApiResponse;
    } catch (e) {
      const msg =
        e instanceof Error && /user rejected|user denied/i.test(e.message)
          ? "You cancelled the signature request."
          : e instanceof Error
            ? e.message
            : "Network error reaching judge.";
      return fail(msg);
    }

    const publicClient = getPublicClient(wagmiConfig);
    if (!publicClient) return fail("No RPC client available.");

    const feeCurrency = getFeeCurrency();

    try {
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
  }, [
    address,
    connectWallet,
    disabled,
    fail,
    isFree,
    onSuccess,
    persona,
    signMessageAsync,
    userInput,
    writeContractAsync,
  ]);

  const idleLabel = !address
    ? "SIGN TO ENTER COURT"
    : isFree
      ? "CLAIM FREE VERDICT"
      : `SUBMIT EVIDENCE (${formatPriceLabel(ROAST_PRICE_WEI)})`;

  const label = phase === "error" ? "TRY AGAIN" : idleLabel;
  const busy = phase !== "idle" && phase !== "error";
  const overlayPhase: OverlayPhase | null = busy ? (phase as OverlayPhase) : null;

  // Button is only disabled by upstream rules (input length / free claimed) when
  // a wallet IS connected. When no address, the button is always live so it can
  // trigger the connect flow.
  const buttonDisabled =
    busy || connectPending || (Boolean(address) && Boolean(disabled));

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={buttonDisabled}
        className={[
          "depress w-full min-h-[56px] rounded-none px-5 py-3 font-display text-lg uppercase tracking-[0.08em]",
          "border bg-[var(--color-judge,var(--color-accent-brutal))] text-[var(--color-bg)]",
          "border-[var(--color-judge-deep,#c8341a)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-judge,var(--color-accent-brutal))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        <span className="inline-flex items-center justify-center gap-2.5">
          <span>{label}</span>
        </span>
      </button>
      {phase === "error" && errMsg && (
        <p
          className="text-sm text-red-300 font-mono leading-snug px-3 py-2 rounded-none border border-red-500/60 bg-red-500/10 whitespace-pre-line"
          role="alert"
        >
          {errMsg}
        </p>
      )}
      <CourtroomOverlay phase={overlayPhase} />
    </div>
  );
}
