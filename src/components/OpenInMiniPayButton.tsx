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
        "inline-flex items-center gap-1.5 rounded-full",
        "bg-bone/5 text-bone/85 border border-bone/15",
        "px-3 py-1.5 text-[11px] font-mono",
        "hover:bg-bone/10 hover:border-bone/25 hover:text-bone",
        "transition-colors",
        className ?? "",
      ].join(" ")}
    >
      <span aria-hidden>📱</span>
      MiniPay
    </a>
  );
}
