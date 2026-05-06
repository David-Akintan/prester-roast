export const ROAST_COURT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

// cUSD on Celo mainnet
export const CUSD_ADDRESS: `0x${string}` =
  "0x765DE816845861e75A25fCA122bb6898B8B1282a";

// USDm on Celo mainnet (MiniPay native feeCurrency)
export const USDM_ADDRESS: `0x${string}` =
  "0x4F604735c1cF31399C6E711D5962b2B3E0225AD3";

export const ROAST_FEE_CUSD = BigInt("50000000000000000"); // 0.05 * 1e18

export const ROAST_COURT_ABI = [
  {
    type: "function",
    name: "requestRoast",
    inputs: [{ name: "contentHash", type: "bytes32" }],
    outputs: [{ name: "verdictId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getVerdict",
    inputs: [{ name: "verdictId", type: "uint256" }],
    outputs: [
      {
        name: "verdict",
        type: "tuple",
        components: [
          { name: "roastee", type: "address" },
          { name: "contentHash", type: "bytes32" },
          { name: "roastHash", type: "bytes32" },
          { name: "timestamp", type: "uint256" },
          { name: "fulfilled", type: "bool" },
        ],
      },
      { name: "cid", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "myVerdicts",
    inputs: [
      { name: "user", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "ids", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "verdictCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "RoastRequested",
    inputs: [
      { name: "verdictId", type: "uint256", indexed: true },
      { name: "roastee", type: "address", indexed: true },
      { name: "contentHash", type: "bytes32", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RoastFulfilled",
    inputs: [
      { name: "verdictId", type: "uint256", indexed: true },
      { name: "roastHash", type: "bytes32", indexed: false },
      { name: "cid", type: "string", indexed: false },
    ],
  },
] as const;

export const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
