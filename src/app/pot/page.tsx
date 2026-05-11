'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { useState, useMemo } from 'react';
import Link from 'next/link';

const ROAST_POT = '0xdcacb893ebaa8b1b1d839353346dcdf556836b02' as const;
const CUSD = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const;

const roastPotAbi = [
  {
    name: 'potByDay',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint64', name: 'utcDay' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'fund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint64', name: 'utcDay' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [],
  },
] as const;

const cUSDAbi = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }, { type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

export default function PotPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ 
    hash,
    onSuccess: (receipt) => {
      // Auto-fund after successful approval
      if (receipt.status === 'success' && lastActionRef.current === 'approve') {
        lastActionRef.current = 'fund';
        handleFund();
      }
    },
  });

  const [fundAmountStr, setFundAmountStr] = useState('0.1');
  const fundAmount = useMemo(() => parseUnits(fundAmountStr || '0', 18), [fundAmountStr]);

  const today = useMemo(() => BigInt(Math.floor(Date.now() / 86400000)), []);

  // Fixed large approval limit (one-time approval)
  const APPROVAL_LIMIT = parseUnits('1', 18); // 1000 cUSD — more than enough for normal use

  // Read current allowance
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: CUSD,
    abi: cUSDAbi,
    functionName: 'allowance',
    args: address ? [address, ROAST_POT] : undefined,
    query: { enabled: !!address },
  });

  const allowance = allowanceRaw || 0n;
  const hasEnoughAllowance = allowance >= fundAmount;

  // Current pot balance
  const { data: currentPotRaw } = useReadContract({
    address: ROAST_POT,
    abi: roastPotAbi,
    functionName: 'potByDay',
    args: [today],
  });
  const currentPot = formatUnits(currentPotRaw || 0n, 18);

  // Track what the last transaction was (approve or fund)
  const lastActionRef = useMemo(() => ({ current: '' as 'approve' | 'fund' }), []);

  const handleApprove = () => {
    lastActionRef.current = 'approve';
    writeContract({
      address: CUSD,
      abi: cUSDAbi,
      functionName: 'approve',
      args: [ROAST_POT, APPROVAL_LIMIT],   // ← fixed large amount
    });
  };

  const handleFund = () => {
    lastActionRef.current = 'fund';
    writeContract({
      address: ROAST_POT,
      abi: roastPotAbi,
      functionName: 'fund',
      args: [today, fundAmount],
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-12">
      {/* Header (unchanged) */}
      <div className="border-b border-yellow-500/30 bg-black sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <span className="text-3xl">⚖️</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter">Roast Court</h1>
              <p className="text-yellow-400 text-xs -mt-1">Daily Roast Pot</p>
            </div>
          </Link>
          <Link href="/" className="text-sm font-medium px-6 py-3 bg-white text-black rounded-2xl hover:bg-yellow-400 transition">
            ← Back to Court
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-10">
        {/* Hero & What is the Pot section (unchanged from previous version) */}
        {/* ... keep the hero + "What is the Daily Roast Pot?" explanation you already have ... */}

        {/* Fund Section — IMPROVED */}
        <div className="bg-zinc-900 border border-yellow-400/30 rounded-3xl p-8 mb-12">
          <h3 className="text-2xl font-bold mb-6">Fund the Pot</h3>

          {!isConnected ? (
            <div className="bg-black border border-dashed border-yellow-400/50 rounded-2xl p-8 text-center text-white/60">
              Connect your wallet to fund the pot
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  value={fundAmountStr}
                  onChange={(e) => setFundAmountStr(e.target.value)}
                  className="flex-1 bg-black border border-white/20 focus:border-yellow-400 rounded-2xl px-6 py-5 text-3xl font-mono text-center outline-none"
                  placeholder="0.1"
                />
                <button
                  onClick={hasEnoughAllowance ? handleFund : handleApprove}
                  disabled={isPending || isConfirming}
                  className="bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 transition text-black font-bold text-xl px-10 rounded-2xl whitespace-nowrap"
                >
                  {isPending || isConfirming
                    ? 'Confirming...'
                    : hasEnoughAllowance
                    ? 'FUND POT'
                    : 'APPROVE cUSD (once)'}
                </button>
              </div>

              <p className="text-xs text-white/40 text-center">
                {hasEnoughAllowance
                  ? '✅ Approved — you can now fund any amount up to 1000 cUSD'
                  : 'One-time approval of 1000 cUSD required'}
              </p>
            </>
          )}
        </div>

        {/* History section (keep your existing 7-day history here) */}
        {/* ... your potHistory map code ... */}

      </div>
    </div>
  );
}