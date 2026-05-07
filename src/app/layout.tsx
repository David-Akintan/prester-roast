import type { Metadata, Viewport } from "next";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700"],
  style: ["normal", "italic"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prester-roast.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Roast Court — pay 10¢, get judged onchain",
    template: "%s · Roast Court",
  },
  description:
    "An AI judge roasts your take for 10¢ in cUSD. Verdict signed and anchored on Celo. By Prester Labs.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "Roast Court",
    description: "Pay 10¢, get roasted onchain by an AI judge.",
    url: appUrl,
    siteName: "Roast Court",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roast Court",
    description: "Pay 10¢, get roasted onchain by an AI judge.",
    images: ["/og-default.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${jetbrains.variable}`}>
      <body className="bg-ink text-bone antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
