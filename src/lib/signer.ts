import { Wallet, getBytes, keccak256, AbiCoder, toUtf8Bytes } from "ethers";
import { PERSONA_INDEX, type Persona } from "./prompts";
import { CHAIN_ID, ROAST_COURT_ADDRESS } from "./contract";

// Server-only judge wallet. Holds no funds. Only authorizes signed verdicts;
// compromise = invalid roasts only, not value loss. Rotate via setJudgeSigner.

let cachedWallet: Wallet | null = null;

function judgeWallet(): Wallet {
  if (cachedWallet) return cachedWallet;
  const pk = process.env.JUDGE_SIGNER_PRIVATE_KEY;
  if (!pk) throw new Error("JUDGE_SIGNER_PRIVATE_KEY not configured");
  cachedWallet = new Wallet(pk);
  return cachedWallet;
}

export function judgeSignerAddress(): string {
  return judgeWallet().address;
}

export function hashUtf8(text: string): `0x${string}` {
  return keccak256(toUtf8Bytes(text)) as `0x${string}`;
}

// Build the EIP-191-style "personal sign" message that RoastCourt verifies.
// Layout (per RoastCourt.sol):
//   keccak256(abi.encode(chainid, address(this), msg.sender, persona,
//                         roastTextHash, inputHash[, uint256(1) if free]))
// Then toEthSignedMessageHash() and ECDSA.recover() on chain.
function buildMessage(args: {
  user: `0x${string}`;
  persona: Persona;
  roastTextHash: `0x${string}`;
  inputHash: `0x${string}`;
  isFree: boolean;
}): `0x${string}` {
  const types = ["uint256", "address", "address", "uint8", "bytes32", "bytes32"];
  const values: unknown[] = [
    BigInt(CHAIN_ID),
    ROAST_COURT_ADDRESS,
    args.user,
    PERSONA_INDEX[args.persona],
    args.roastTextHash,
    args.inputHash,
  ];
  if (args.isFree) {
    types.push("uint256");
    values.push(1n);
  }
  const encoded = AbiCoder.defaultAbiCoder().encode(types, values);
  return keccak256(encoded) as `0x${string}`;
}

// Returns a hex signature ready to pass as `judgeSig` to issueVerdict /
// claimFreeRoast. The contract applies toEthSignedMessageHash internally,
// so we sign the raw 32-byte digest with `signMessage(getBytes(...))`.
export async function signVerdict(args: {
  user: `0x${string}`;
  persona: Persona;
  roastTextHash: `0x${string}`;
  inputHash: `0x${string}`;
  isFree?: boolean;
}): Promise<`0x${string}`> {
  const digest = buildMessage({
    user: args.user,
    persona: args.persona,
    roastTextHash: args.roastTextHash,
    inputHash: args.inputHash,
    isFree: args.isFree ?? false,
  });
  const sig = await judgeWallet().signMessage(getBytes(digest));
  return sig as `0x${string}`;
}
