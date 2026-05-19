import { CHAIN_ID, ROAST_COURT_ADDRESS } from "./contract";
import type { Persona } from "./prompts";

export interface RoastRequestAuthPayload {
  wallet: `0x${string}`;
  persona: Persona;
  userInput: string;
  isFree: boolean;
  utcDay: number;
}

export function buildRoastRequestMessage({
  wallet,
  persona,
  userInput,
  isFree,
  utcDay,
}: RoastRequestAuthPayload): string {
  return [
    "Roast Court request",
    `Wallet: ${wallet}`,
    `Contract: ${ROAST_COURT_ADDRESS}`,
    `Chain ID: ${CHAIN_ID}`,
    `Persona: ${persona}`,
    `Mode: ${isFree ? "free" : "paid"}`,
    `UTC day: ${utcDay}`,
    `Evidence: ${userInput.trim()}`,
  ].join("\n");
}
