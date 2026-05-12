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
          Roast Court is the premier AI-judge primitive from Prester Labs, built
          specifically for the MiniPay ecosystem. For a small fee of{" "}
          {formatPriceLabel(ROAST_PRICE_WEI)} in cUSD, an advanced AI judge
          evaluates your take, issues a signed verdict, and anchors that
          judgment permanently on the Celo blockchain.
        </p>
        <p className="text-base text-bone/85 leading-relaxed">
          The roast text is stored via IPFS, while the blockchain secures a
          cryptographic hash. This ensures your roast is verifiable and
          immutable without bloating the chain, utilizing the same "thin-chain"
          architecture as Prester&apos;s flagship dispute-resolution protocols.
          The roast text itself lives on IPFS.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Why pay 10¢ for a roast?</h2>
        <p className="text-base text-bone/85 leading-relaxed">
          Because friction breeds quality. While free chatbots offer generic,
          throwaway burns, the 10¢ surcharge, paid in native{" "}
          <strong>cUSD</strong> you already hold in MiniPay and transforms a
          simple joke into a digital artifact worth sharing. Every verdict is
          cryptographically signed and anchored onchain, it cannot be edited,
          denied, or regenerated.
        </p>
        <p className="text-base text-bone/85 leading-relaxed">
          <em>The Daily Ritual:</em> Every wallet gets one free daily roast on a
          fresh, global topic. Once that's gone, the paid loop ensures the Court
          stays sharp and the stakes stay high.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">How it works</h2>
        <ol className="list-decimal list-outside ml-5 space-y-2 text-base text-bone/85 leading-relaxed">
          <li>
            <em>Select Your Judge: </em>Choose a persona; Brutal, Wholesome, or
            Corporate.
          </li>
          <li>
            <em>Submit Your Take: </em>Enter the text you want judged. Our
            system runs a quick safety filter to ensure the fun stays within
            bounds.
          </li>
          <li>
            <em>The Verdict: </em>The AI judge processes your input, calculates
            a "Severity Score," and signs the result.
          </li>
          <li>
            <em>Onchain Anchor: </em>You sign two quick transactions: an{" "}
            <code className="font-mono text-sm">approve()</code> for the cUSD
            fee and <code className="font-mono text-sm">issueVerdict()</code> to
            the RoastCourt contract.
          </li>
          <li>
            <em>Immortalize: </em>Once confirmed, your roast is live onchain.
            Sharing the link generates a custom OG image featuring your official
            verdict.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">The Contract</h2>
        <p className="text-sm font-mono text-bone/70 break-all">
          Transparency is at our core. You can view the RoastCourt logic and
          verify the judge&apos;s wallet signatures directly on Celoscan.
        </p>
        <p className="text-sm font-mono text-bone/55">
          Contract Address:{" "}
          <a
            href={explorerAddressUrl(ROAST_COURT_ADDRESS)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-bone hover:text-ember transition"
          >
            {ROAST_COURT_ADDRESS}
          </a>
        </p>
        <p className="text-sm font-mono text-bone/55">
          Status: Verified on <em>Celoscan.</em>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Safety & Standards</h2>
        <p className="text-base text-bone/85 leading-relaxed">
          The Court is sharp, but it plays fair. Our AI judges are strictly
          programmed to never target protected attributes (race, religion,
          disability, etc.). We proactively block PII (Personally Identifiable
          Information), threats, and self-harm patterns before they ever reach
          the judge.
        </p>
        <p className="text-base text-bone/85 leading-relaxed">
          A Note on Well-being: Roast Court is for entertainment. If you are
          going through a hard time, the Court is not the right venue. Please
          visit{" "}
          <a
            href="https://findahelpline.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ember transition"
          >
            findahelpline.com
          </a>{" "}
          to connect with support in your local language and country.
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
