'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useState, useMemo } from 'react';
import Link from 'next/link';

const ROAST_POT = '0xdcacb893ebaa8b1b1d839353346dcdf556836b02' as const;
const CUSD = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as const;

const roastPotAbi = [
  { name: 'potByDay', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint64', name: 'utcDay' }], outputs: [{ type: 'uint256' }] },
  { name: 'fund', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'uint64', name: 'utcDay' }, { type: 'uint256', name: 'amount' }], outputs: [] },
] as const;

const cUSDAbi = [
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

export default function PotPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [fundAmountStr, setFundAmountStr] = useState('0.1');
  const fundAmount = useMemo(() => parseUnits(fundAmountStr || '0', 18), [fundAmountStr]);

  const today = useMemo(() => BigInt(Math.floor(Date.now() / 86400000)), []);

  const APPROVAL_LIMIT = parseUnits('1000', 18);

  // Read allowance
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

  const handleApprove = () => {
    writeContract({
      address: CUSD,
      abi: cUSDAbi,
      functionName: 'approve',
      args: [ROAST_POT, APPROVAL_LIMIT],
    });
  };

  const handleFund = () => {
    writeContract({
      address: ROAST_POT,
      abi: roastPotAbi,
      functionName: 'fund',
      args: [today, fundAmount],
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-12">
      {/* Header */}
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
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-black text-sm font-bold px-6 py-2 rounded-3xl mb-6">🔥 LIVE DAILY POT</div>
          <h2 className="text-7xl font-mono font-bold text-yellow-400 tracking-tighter mb-2">
            {currentPot} <span className="text-4xl text-white/70">cUSD</span>
          </h2>
          <p className="text-xl text-white/70">Today’s prize pool • Winner awarded at midnight UTC</p>
        </div>

        {/* What is the Pot */}
        <div className="bg-zinc-900 border border-yellow-400/30 rounded-3xl p-8 mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-yellow-400">🔥</span>
            What is the Daily Roast Pot?
          </h3>
          <div className="space-y-6 text-[15px]">
            <p>Every time someone pays <span className="text-yellow-400 font-medium">10¢ (cUSD)</span> to get roasted, that money automatically goes into today’s <strong>Roast Pot</strong>.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-black/50 rounded-2xl p-5"><div className="text-yellow-400 text-xl mb-2">💰</div><p className="font-medium">Funded by the community</p><p className="text-white/60 text-sm">Every paid roast adds to the pot</p></div>
              <div className="bg-black/50 rounded-2xl p-5"><div className="text-yellow-400 text-xl mb-2">🏆</div><p className="font-medium">One winner per day</p><p className="text-white/60 text-sm">Awarded at midnight UTC</p></div>
              <div className="bg-black/50 rounded-2xl p-5"><div className="text-yellow-400 text-xl mb-2">📈</div><p className="font-medium">You can win it</p><p className="text-white/60 text-sm">Best/funniest roast of the day</p></div>
            </div>
          </div>
        </div>

        {/* Fund Section */}
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

        {/* Footer note */}
        <div className="mt-16 text-center text-white/30 text-xs">
          RoastPot • 0xdcacb893ebaa8b1b1d839353346dcdf556836b02
          <br />
          All data read live from Celo mainnet
        </div>
      </div>
    </div>
  );
}