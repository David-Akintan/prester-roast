// Onchain integration constants.
// Hand-curated ABI (subset) — keeps bundle small AND gives wagmi/viem
// type inference the `as const` they need.

import type { Persona } from "./prompts";
import { PERSONA_INDEX } from "./prompts";

// ── Addresses ─────────────────────────────────────────────────────────

export const ROAST_COURT_ADDRESS = (process.env.NEXT_PUBLIC_ROAST_COURT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CUSD_ADDRESS = (process.env.NEXT_PUBLIC_CUSD_ADDRESS ??
  "0x765DE816845861e75A25fCA122bb6898B8B1282a") as `0x${string}`;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "42220");

// ── Constants ─────────────────────────────────────────────────────────

// 0.10 cUSD at 18 decimals — must match RoastCourt.priceWei on chain.
export const ROAST_PRICE_WEI: bigint = 100_000_000_000_000_000n;

export { PERSONA_INDEX };
export type { Persona };

// ── ABIs ──────────────────────────────────────────────────────────────

export const ROAST_COURT_ABI = [
  // Reads
  {
    type: "function",
    name: "verdicts",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "user", type: "address" },
      { name: "amountPaid", type: "uint256" },
      { name: "roastTextHash", type: "bytes32" },
      { name: "inputHash", type: "bytes32" },
      { name: "persona", type: "uint8" },
      { name: "timestamp", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "roastCount",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "lastFreeRoast",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "priceWei",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "nextId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  // Writes
  {
    type: "function",
    name: "issueVerdict",
    stateMutability: "nonpayable",
    inputs: [
      { name: "persona", type: "uint8" },
      { name: "roastTextHash", type: "bytes32" },
      { name: "inputHash", type: "bytes32" },
      { name: "judgeSig", type: "bytes" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimFreeRoast",
    stateMutability: "nonpayable",
    inputs: [
      { name: "persona", type: "uint8" },
      { name: "roastTextHash", type: "bytes32" },
      { name: "inputHash", type: "bytes32" },
      { name: "judgeSig", type: "bytes" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  // Events
  {
    type: "event",
    name: "RoastIssued",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "persona", type: "uint8", indexed: false },
      { name: "roastTextHash", type: "bytes32", indexed: false },
      { name: "inputHash", type: "bytes32", indexed: false },
      { name: "amountPaid", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;
