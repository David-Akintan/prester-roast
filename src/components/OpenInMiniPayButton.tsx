"use client";

import { useEffect, useState } from "react";
import { isMiniPay, openInMiniPayUrl } from "@/lib/minipay";

export function OpenInMiniPayButton({ className }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isMiniPay());
  }, []);

  if (!show) return null;

  return (
    <a
      href={openInMiniPayUrl()}
      className={[
        "lift inline-flex items-center gap-1.5 rounded-none border-2 border-[#262626]",
        "bg-gradient-to-b from-[#1c1c1f] to-[#0f0f10] text-bone/90",
        "px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em]",
        "hover:border-ember hover:text-ember hover:shadow-[0_0_16px_-4px_rgba(255,87,51,0.4)]",
        className ?? "",
      ].join(" ")}
    >
      <span aria-hidden>📱</span>
      MiniPay
    </a>
  );
}
