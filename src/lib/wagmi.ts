import { createConfig, createStorage, http } from "wagmi";
import { celo } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://forno.celo.org";

// MiniPay injects window.ethereum and the layout auto-connects via injected().
// WalletConnect is the desktop-browser fallback (Valora, Rainbow, etc.).
const connectors = [
  injected({ shimDisconnect: true }),
  ...(WC_PROJECT_ID
    ? [
        walletConnect({
          projectId: WC_PROJECT_ID,
          showQrModal: true,
          metadata: {
            name: "Roast Court",
            description: "Pay 10¢, get roasted onchain by an AI judge.",
            url: process.env.NEXT_PUBLIC_APP_URL ?? "https://prester-roast.vercel.app",
            icons: [
              `${process.env.NEXT_PUBLIC_APP_URL ?? "https://prester-roast.vercel.app"}/icon-512.png`,
            ],
          },
        }),
      ]
    : []),
];

// Explicit storage so reconnect() in providers.tsx has a deterministic place
// to read the last-used connector from after a refresh. Default would also
// work, but with ssr: true it's worth being explicit about which side persists.
const storage =
  typeof window !== "undefined"
    ? createStorage({ storage: window.localStorage, key: "roast-court.wagmi" })
    : undefined;

export const config = createConfig({
  chains: [celo],
  connectors,
  transports: { [celo.id]: http(RPC_URL) },
  ssr: true,
  storage,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
