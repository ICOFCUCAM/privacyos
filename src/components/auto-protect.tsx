"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Fires one autonomous remediation pass when an entitled, non-advisor customer
 * opens their dashboard — so Autopilot actually acts (opens cases, files
 * removals) and logs it, rather than only describing what it would do. Runs at
 * most once per tab session; the server pass is idempotent. Renders nothing.
 */
export function AutoProtect() {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    try {
      if (sessionStorage.getItem("po_autoprotect") === "1") return;
      sessionStorage.setItem("po_autoprotect", "1");
    } catch { /* ignore */ }

    (async () => {
      try {
        const res = await fetch("/api/protect/run", { method: "POST" });
        const data = await res.json();
        if (data?.ran && (data.casesOpened > 0 || data.removalsFiled > 0)) {
          router.refresh();
        }
      } catch { /* best-effort */ }
    })();
  }, [router]);

  return null;
}
