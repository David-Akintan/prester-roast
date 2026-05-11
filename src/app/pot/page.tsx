'use client';

import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useState, useMemo } from 'react';
import Link from 'next/link';

const ROAST_POT = '0xdcacb893ebaa8b1b1d839353346dcdf556836b02' as const;

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

export default function PotPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [fundAmount, setFundAmount] = useState('0.1');

  // Today’s UTC day
  const today = useMemo(() => BigInt(Math.floor(Date.now() / 86400000)), []);

  // Last 7 days for history
  const days = useMemo(() => {
    const arr: bigint[] = [];
    for (let i = 0; i < 7; i++) {
      arr.push(today - BigInt(i));
    }
    return arr;
  }, [today]);

  // Batch read all pot balances
  const { data: potsData, isLoading } = useReadContracts({
    contracts: days.map((day) => ({
      address: ROAST_POT,
      abi: roastPotAbi,
      functionName: 'potByDay',
      args: [day],
    })),
  });

  const potHistory = useMemo(() => {
    return days.map((day, index) => {
      const balance = potsData?.[index]?.result || 0n;
      const date = new Date(Number(day) * 86400000);
      return {
        day,
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        balance,
        humanBalance: formatUnits(balance, 18),
      };
    });
  }, [days, potsData]);

  const currentPot = potHistory[0]?.humanBalance || '0';

  const handleFund = async () => {
    if (!isConnected) return;
    const amount = parseUnits(fundAmount, 18);
    writeContract({
      address: ROAST_POT,
      abi: roastPotAbi,
      functionName: 'fund',
      args: [today, amount],
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
          <Link
            href="/"
            className="text-sm font-medium px-6 py-3 bg-white text-black rounded-2xl hover:bg-yellow-400 transition"
          >
            ← Back to Court
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-10">
        {/* Hero Pot */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-black text-sm font-bold px-6 py-2 rounded-3xl mb-6">
            🔥 LIVE DAILY POT
          </div>
          <h2 className="text-7xl font-mono font-bold text-yellow-400 tracking-tighter mb-2">
            {currentPot} <span className="text-4xl text-white/70">cUSD</span>
          </h2>
          <p className="text-xl text-white/70">Today’s prize pool • Winner awarded at midnight UTC</p>
          <p className="text-sm text-white/40 mt-3">
            Every paid roast adds to the pot • Community-funded
          </p>
        </div>

        {/* Fund Card */}
        <div className="bg-zinc-900 border border-yellow-400/30 rounded-3xl p-8 mb-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span>Fund the Pot</span>
            <span className="text-yellow-400 text-3xl">💰</span>
          </h3>

          {!isConnected ? (
            <div className="bg-black border border-dashed border-yellow-400/50 rounded-2xl p-8 text-center">
              <p className="text-white/60">Connect your wallet to fund the pot</p>
            </div>
          ) : (
            <div className="flex gap-4">
              <input
                type="text"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="flex-1 bg-black border border-white/20 focus:border-yellow-400 rounded-2xl px-6 py-5 text-3xl font-mono text-center outline-none"
                placeholder="0.1"
              />
              <button
                onClick={handleFund}
                disabled={isConfirming}
                className="bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 transition text-black font-bold text-xl px-10 rounded-2xl whitespace-nowrap"
              >
                {isConfirming ? 'Confirming...' : 'SEND cUSD'}
              </button>
            </div>
          )}
          <p className="text-xs text-white/40 text-center mt-6">
            Minimum 0.01 cUSD • Anyone can fund • Funds go directly into today’s pot
          </p>
        </div>

        {/* History */}
        <div>
          <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
            Last 7 Days
            {isLoading && <span className="text-yellow-400 text-sm animate-pulse">Loading onchain data...</span>}
          </h3>

          <div className="space-y-3">
            {potHistory.map((pot) => (
              <div
                key={pot.day.toString()}
                className="flex items-center justify-between bg-zinc-900 border border-white/10 hover:border-yellow-400/30 transition rounded-2xl px-6 py-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center text-xl">
                    🔥
                  </div>
                  <div>
                    <p className="font-medium">{pot.date}</p>
                    <p className="text-xs text-white/40">UTC Day {pot.day.toString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-3xl font-bold text-yellow-400">
                    {pot.humanBalance}
                  </p>
                  <p className="text-xs text-white/40">cUSD</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center text-white/30 text-xs">
          RoastPot • 0xdcacb893ebaa8b1b1d839353346dcdf556836b02<br />
          All data read live from Celo mainnet
        </div>
      </div>
    </div>
  );
}
