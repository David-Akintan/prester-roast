"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  useConnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { injected } from "wagmi/connectors";
import {
  ROAST_COURT_ADDRESS,
  CUSD_ADDRESS,
  ROAST_FEE_CUSD,
  ROAST_COURT_ABI,
  ERC20_APPROVE_ABI,
} from "@/lib/contract";
import { isMiniPay, getFeeCurrency, hashContent } from "@/lib/minipay";
import { moderate } from "@/lib/moderation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "idle" | "approving" | "waiting_approve" | "requesting" | "waiting_tx" | "polling" | "done" | "error";

interface VerdictLocal {
  verdictId: number;
  content: string;
  roast?: string;
  fulfilled: boolean;
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortenAddress(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function farcasterShareUrl(roast: string, verdictId: number) {
  const text = encodeURIComponent(
    `The Roast Court has spoken 🔨 Verdict #${verdictId}:\n\n"${roast.slice(0, 200)}"\n\nGet roasted → presterr.vercel.app/roast`
  );
  return `https://warpcast.com/~/compose?text=${text}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const publicClient = usePublicClient();

  const [content, setContent] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState("");
  const [pendingVerdictId, setPendingVerdictId] = useState<number | null>(null);
  const [verdicts, setVerdicts] = useState<VerdictLocal[]>([]);
  const [totalVerdicts, setTotalVerdicts] = useState<number>(0);
  const pollRef = useRef<NodeJS.Timeout>();

  const inMiniPay = typeof window !== "undefined" ? isMiniPay() : false;

  // ── Read total verdict count ──────────────────────────────────────────────

  const { data: verdictCount, refetch: refetchCount } = useReadContract({
    address: ROAST_COURT_ADDRESS,
    abi: ROAST_COURT_ABI,
    functionName: "verdictCount",
  });

  useEffect(() => {
    if (verdictCount !== undefined) {
      setTotalVerdicts(Number(verdictCount));
    }
  }, [verdictCount]);

  // ── Write contract hooks ──────────────────────────────────────────────────

  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeRequestRoast } = useWriteContract();

  // ── Toast helper ─────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  // ── Handle submit ─────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!isConnected || !address) return;

    const verdict = moderate(content);
    if (!verdict.ok) {
      setErrorMsg(verdict.reason || "Submission rejected.");
      return;
    }

    setErrorMsg("");
    setStep("approving");

    try {
      const feeCurrency = getFeeCurrency();
      const contentHash = await hashContent(content.trim());

      // Step 1: Approve cUSD spend
      showToast("Approving 0.05 cUSD spend…");
      const approveTxHash = await writeApprove({
        address: CUSD_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [ROAST_COURT_ADDRESS, ROAST_FEE_CUSD],
        // @ts-ignore — feeCurrency is a Celo extension
        ...(feeCurrency ? { feeCurrency } : {}),
      });

      setStep("waiting_approve");
      showToast("Confirming approval…");

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      }

      // Step 2: Request roast
      setStep("requesting");
      showToast("Submitting to the Court…");

      const roastTxHash = await writeRequestRoast({
        address: ROAST_COURT_ADDRESS,
        abi: ROAST_COURT_ABI,
        functionName: "requestRoast",
        args: [contentHash as `0x${string}`],
        // @ts-ignore
        ...(feeCurrency ? { feeCurrency } : {}),
      });

      setStep("waiting_tx");
      showToast("Transaction confirmed. The Judge deliberates…");

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: roastTxHash,
        });

        // Extract verdictId from RoastRequested event
        const ROAST_REQUESTED_TOPIC =
          "0x" + // keccak256("RoastRequested(uint256,address,bytes32,uint256)")
          "b5c9a4d1f2e3a6c8e7f5d2b1a9c4e6f8d3b2a1c9e8f7d6b5a4c3e2f1d0b9a8c7";
        // We'll just use the total count to infer verdictId (totalVerdicts was N, new one is N)
        // More robust: read from event logs
        let newVerdictId = totalVerdicts;

        // Try to parse from logs
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === ROAST_COURT_ADDRESS.toLowerCase()) {
            // First indexed topic after event selector is verdictId
            if (log.topics.length >= 2) {
              newVerdictId = parseInt(log.topics[1], 16);
            }
            break;
          }
        }

        setPendingVerdictId(newVerdictId);

        // Add to local list as pending
        const newVerdict: VerdictLocal = {
          verdictId: newVerdictId,
          content: content.trim(),
          fulfilled: false,
          timestamp: Date.now(),
        };
        setVerdicts((prev) => [newVerdict, ...prev]);
        setContent("");
        refetchCount();

        // Step 3: Call our API to trigger the judge backend
        setStep("polling");
        const apiRes = await fetch("/api/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verdictId: newVerdictId,
            content: newVerdict.content,
          }),
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          setVerdicts((prev) =>
            prev.map((v) =>
              v.verdictId === newVerdictId
                ? { ...v, roast: data.roast, fulfilled: true }
                : v
            )
          );
          showToast("⚖️ The Court has spoken!");
        } else {
          // Poll for fulfillment (backend may be async)
          startPolling(newVerdictId);
        }

        setStep("done");
        setPendingVerdictId(null);
      }
    } catch (err: any) {
      console.error(err);
      setStep("error");
      const msg = err?.shortMessage || err?.message || "Transaction failed";
      setErrorMsg(msg);
    }
  }, [
    isConnected,
    address,
    content,
    totalVerdicts,
    writeApprove,
    writeRequestRoast,
    publicClient,
    refetchCount,
  ]);

  // ── Poll for fulfillment ──────────────────────────────────────────────────

  function startPolling(verdictId: number) {
    let attempts = 0;
    const maxAttempts = 12; // 60s total

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        if (!publicClient) return;
        const result = await publicClient.readContract({
          address: ROAST_COURT_ADDRESS,
          abi: ROAST_COURT_ABI,
          functionName: "getVerdict",
          args: [BigInt(verdictId)],
        });

        const [verdict] = result as any;
        if (verdict.fulfilled) {
          clearInterval(pollRef.current);
          // Fetch roast text from CID or API
          const apiRes = await fetch(`/api/roast?verdictId=${verdictId}`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            setVerdicts((prev) =>
              prev.map((v) =>
                v.verdictId === verdictId
                  ? { ...v, roast: data.roast, fulfilled: true }
                  : v
              )
            );
            showToast("⚖️ The Court has spoken!");
          }
        }
      } catch {}

      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        showToast("Roast is processing — check back shortly.");
      }
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  const isBusy =
    step === "approving" ||
    step === "waiting_approve" ||
    step === "requesting" ||
    step === "waiting_tx" ||
    step === "polling";

  const charCount = content.length;
  const MAX_CHARS = 2000;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <span className="header-gavel">⚖️</span>
          <span className="header-title">Roast Court</span>
        </div>
        <div className="header-sub">by Prester Labs · Celo Mainnet</div>
        {isConnected && address && (
          <div className="header-address">{shortenAddress(address)}</div>
        )}
      </header>

      {/* Stats */}
      <div className="stat-bar">
        <div className="stat-pill">
          <span className="stat-pill-label">Verdicts</span>
          <span className="stat-pill-value">{totalVerdicts}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Fee</span>
          <span className="stat-pill-value">0.05 cUSD</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Network</span>
          <span className="stat-pill-value">Celo</span>
        </div>
      </div>

      {/* Connect — only shown outside MiniPay */}
      {!isConnected && !inMiniPay && (
        <div className="connect-panel">
          <p>
            Open in MiniPay for the best experience.
            <br />
            Or connect your wallet below.
          </p>
          <button
            className="btn-primary"
            onClick={() => connect({ connector: injected() })}
          >
            Connect Wallet
          </button>
        </div>
      )}

      {/* Submit form */}
      {isConnected && (
        <>
          <div className="section-label">Submit your take for judgment</div>
          <textarea
            className="roast-input"
            placeholder="Paste your tweet, code snippet, hot take, or life decision. The Judge shows no mercy."
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            disabled={isBusy}
            rows={5}
          />
          <div className={`char-count ${charCount > MAX_CHARS - 100 ? "near-limit" : ""}`}>
            {charCount}/{MAX_CHARS}
          </div>

          {/* Step progress */}
          {isBusy && (
            <div style={{ marginBottom: 14 }}>
              <div className="step-row">
                <div
                  className={`step-dot ${
                    step === "approving" || step === "waiting_approve"
                      ? "active"
                      : ["requesting", "waiting_tx", "polling"].includes(step)
                      ? "done"
                      : ""
                  }`}
                />
                Approving cUSD spend
              </div>
              <div className="step-row">
                <div
                  className={`step-dot ${
                    step === "requesting" || step === "waiting_tx"
                      ? "active"
                      : step === "polling"
                      ? "done"
                      : ""
                  }`}
                />
                Submitting to the Court
              </div>
              <div className="step-row">
                <div className={`step-dot ${step === "polling" ? "active" : ""}`} />
                The Judge deliberates…
              </div>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isBusy || content.trim().length < 10}
          >
            {isBusy ? (
              <>
                <span className="spinner" />
                {step === "approving" || step === "waiting_approve"
                  ? "Approving…"
                  : step === "requesting" || step === "waiting_tx"
                  ? "Submitting…"
                  : "Judge deliberates…"}
              </>
            ) : (
              "⚖️ Submit for Judgment — 0.05 cUSD"
            )}
          </button>

          {errorMsg && (
            <div className="error-box">
              {errorMsg}
              <br />
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  marginTop: 4,
                }}
                onClick={() => {
                  setStep("idle");
                  setErrorMsg("");
                }}
              >
                Try again
              </button>
            </div>
          )}
        </>
      )}

      {/* Verdicts list */}
      {verdicts.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-label">Your verdicts</div>
          <div className="verdict-list">
            {verdicts.map((v) => (
              <div
                key={v.verdictId}
                className={`verdict-card ${v.fulfilled ? "fulfilled" : "pending"}`}
              >
                <div className="verdict-meta">
                  <span className="verdict-id">Verdict #{v.verdictId}</span>
                  <span
                    className={`verdict-badge ${v.fulfilled ? "fulfilled" : "pending"}`}
                  >
                    {v.fulfilled ? "Sentenced" : "Deliberating"}
                  </span>
                </div>

                {v.fulfilled && v.roast ? (
                  <>
                    <p className="verdict-roast">"{v.roast}"</p>
                    <button
                      className="fc-share-btn"
                      onClick={() =>
                        window.open(farcasterShareUrl(v.roast!, v.verdictId))
                      }
                    >
                      ↗ Share on Farcaster
                    </button>
                  </>
                ) : (
                  <p className="verdict-pending-text">
                    Waiting for the Judge's verdict…
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
