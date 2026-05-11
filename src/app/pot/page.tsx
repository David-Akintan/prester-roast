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
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export default function PotPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [fundAmountStr, setFundAmountStr] = useState('0.1');
  const fundAmount = useMemo(() => parseUnits(fundAmountStr || '0', 18), [fundAmountStr]);

  const today = useMemo(() => BigInt(Math.floor(Date.now() / 86400000)), []);

  const APPROVAL_LIMIT = parseUnits('1000', 18);

  // Current REAL pot balance (cUSD balance in RoastPot)
  const { data: realPotRaw } = useReadContract({
    address: CUSD,
    abi: cUSDAbi,
    functionName: 'balanceOf',
    args: [ROAST_POT],
  });
  const currentPot = formatUnits(realPotRaw || 0n, 18);

  // Allowance
  const { data: allowanceRaw } = useReadContract({
    address: CUSD,
    abi: cUSDAbi,
    functionName: 'allowance',
    args: address ? [address, ROAST_POT] : undefined,
    query: { enabled: !!address },
  });
  const allowance = allowanceRaw || 0n;
  const hasEnoughAllowance = allowance >= fundAmount;

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
      {/* Header unchanged */}
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
        {/* Hero — now shows REAL balance */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-black text-sm font-bold px-6 py-2 rounded-3xl mb-6">🔥 LIVE DAILY POT</div>
          <h2 className="text-7xl font-mono font-bold text-yellow-400 tracking-tighter mb-2">
            {currentPot} <span className="text-4xl text-white/70">cUSD</span>
          </h2>
          <p className="text-xl text-white/70">Today’s prize pool • Winner awarded at midnight UTC</p>
        </div>

        {/* Rest of the page (What is the Pot + Fund section) remains the same */}
        {/* ... paste the "What is the Daily Roast Pot?" section and Fund section from previous version ... */}

      </div>
    </div>
  );
}