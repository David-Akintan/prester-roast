import Link from "next/link";
import { explorerAddressUrl } from "@/lib/celoscan";
import { ROAST_COURT_ADDRESS, ROAST_PRICE_WEI } from "@/lib/contract";
import { formatPriceLabel } from "@/lib/format";

export const metadata = {
  title: "About",
  description:
    "Roast Court is the AI-judge primitive from Prester Labs, productized for MiniPay.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10 space-y-10 fade-in-up">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-bone/55 hover:text-bone transition-colors"
        >
          ← Roast Court
        </Link>
      </header>

      <section className="space-y-4">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-[0.95]">
          About the Court
        </h1>
        <p className="text-base text-bone/85 leading-relaxed">
          Roast Court is the AI-judge primitive from Prester Labs, productized
          for MiniPay&apos;s installed base. You pay {formatPriceLabel(ROAST_PRICE_WEI)} in cUSD,
          a Gemini-2.5-flash judge issues a verdict, our judge wallet signs it,
          and the verdict is anchored onchain on Celo.
        </p>
        <p className="text-base text-bone/85 leading-relaxed">
          The roast text itself lives on IPFS. The chain stores hashes only —
          enough to prove what was said, without storing the words. That&apos;s the
          same architecture as Prester&apos;s flagship dispute-resolution protocol,
          simplified to a single-judge attestation for a consumer surface.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Why pay 10¢ for a joke?</h2>
        <p className="text-base text-bone/85 leading-relaxed">
          Because friction breeds quality. Free chatbots roast you in their
          sleep. The 10¢ surcharge — paid in <strong>cUSD</strong>, the same
          currency MiniPay&apos;s 7M users hold — turns the roast into something
          worth screenshotting. Verdicts are signed and anchored, so they
          can&apos;t be silently regenerated or denied.
        </p>
        <p className="text-base text-bone/85 leading-relaxed">
          A free <em>daily</em> roast keeps people coming back without
          shrinking the paid loop: one per wallet, one fresh topic per UTC day.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">How it works</h2>
        <ol className="list-decimal list-outside ml-5 space-y-2 text-base text-bone/85 leading-relaxed">
          <li>Pick a persona — Brutal, Wholesome, or Corporate.</li>
          <li>Type your take. We run a moderation filter (PII, threats, self-harm).</li>
          <li>Server calls Gemini, gets a roast + severity, signs the bundle.</li>
          <li>You sign two transactions: <code className="font-mono text-sm">approve()</code> on cUSD and{" "}
            <code className="font-mono text-sm">issueVerdict()</code> on RoastCourt.</li>
          <li>Your verdict is now onchain. Share the page; the OG image renders the roast.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Contract</h2>
        <p className="text-sm font-mono text-bone/70 break-all">
          RoastCourt @{" "}
          <a
            href={explorerAddressUrl(ROAST_COURT_ADDRESS)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-bone hover:text-ember transition"
          >
            {ROAST_COURT_ADDRESS}
          </a>
        </p>
        <p className="text-sm font-mono text-bone/55">Verified on Celoscan.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Safety</h2>
        <p className="text-base text-bone/85 leading-relaxed">
          The judge is sharp but never punches at protected attributes (race,
          religion, disability, etc.) — that&apos;s baked into every persona prompt.
          We block self-harm patterns, threats, and PII pre-judge.
        </p>
        <p className="text-base text-bone/85 leading-relaxed">
          If you&apos;re struggling, the Court isn&apos;t the right venue —{" "}
          <a
            href="https://findahelpline.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ember transition"
          >
            findahelpline.com
          </a>{" "}
          has real humans, in your country, in your language.
        </p>
      </section>

      <footer className="pt-6 border-t-2 border-[#262626] text-[11px] font-mono text-bone/40 space-y-1 uppercase tracking-[0.15em]">
        <p>Built by Prester Labs for Celo Proof of Ship.</p>
        <p>
          Source:{" "}
          <a
            href="https://github.com/prester-labs/prester-roast"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-bone/70 transition"
          >
            github.com/prester-labs/prester-roast
          </a>
        </p>
      </footer>
    </main>
  );
}
