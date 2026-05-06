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
        "inline-flex items-center gap-2 rounded-full bg-bone text-ink",
        "px-4 py-2 text-sm font-medium hover:bg-bone/90 transition",
        className ?? "",
      ].join(" ")}
    >
      <span aria-hidden>📱</span>
      Open in MiniPay
    </a>
  );
}
