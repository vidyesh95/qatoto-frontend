"use client";

// TRANSPORT: props-only — derives from a prop, no network.
//
// Whether a certificate's validity window has closed. This is the ONE thing on the
// storefront that genuinely depends on "now", and it is computed here, on the client,
// for two reasons that point the same way:
//
//   - The backend deliberately has no `expired` state. Lapsing is `validUntil < today`,
//     because a stored flag would need a nightly job to flip it and would therefore be
//     WRONG between ticks, publishing a lapsed certificate until the next run.
//   - Cache Components rejects `new Date()` during prerender, and rightly so: baking the
//     build date into a static page would reintroduce exactly that staleness.
//
// So the pill resolves after mount. Until then it renders nothing — the validity dates
// themselves are server-rendered and always visible, so no information is withheld, and
// a missing pill is never mistaken for a claim of validity.

import { useEffect, useState } from "react";

export default function CertificationValidityPill({ validUntil }: { validUntil: string }) {
  const [isLapsed, setIsLapsed] = useState<boolean | null>(null);

  useEffect(() => {
    // The wire carries `YYYY-MM-DD`. Building today's key from local date parts keeps the
    // comparison in the viewer's own day rather than UTC's, which can be a day ahead.
    const now = new Date();
    const todayIsoDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    setIsLapsed(validUntil < todayIsoDate);
  }, [validUntil]);

  if (isLapsed === null || !isLapsed) return null;

  return (
    <span className="rounded bg-[#E0E3E3] px-2 py-0.5 text-[11px] leading-4 font-medium tracking-[0.5px] text-[#4A6364]">
      Lapsed
    </span>
  );
}
