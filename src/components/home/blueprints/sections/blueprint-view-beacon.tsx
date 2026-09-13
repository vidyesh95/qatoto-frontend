"use client";

// TRANSPORT: client-query — fires the view beacon once, on mount.
//
// ⚠️ AN ISLAND THAT RENDERS NOTHING, and that is the whole component. The three detail pages are
// server components and the beacon is a WRITE; it cannot ride along with the render, and it must
// not run on the server, where every request would come from one machine and collapse into one
// fingerprint.

import { useEffect, useRef } from "react";

import { recordBlueprintViewOnce } from "@/hooks/blueprints/engagement";
import type { BlueprintArm } from "@/lib/blueprints/engagement.schemas";

/**
 * Records that this page was opened.
 *
 * ⚠️ ONCE PER MOUNT, GUARDED BY A REF. React's development Strict Mode runs effects twice, and
 * without the guard every local page view would fire two beacons. The server would swallow the
 * second — its unique index on `(target, fingerprint, day)` is the anti-replay boundary and the
 * counter only moves when a row was actually inserted — but relying on that would mean sending a
 * request whose only purpose is to be rejected.
 *
 * ⚠️ NOT A HEARTBEAT. A video beacon repeats every ~15 seconds because a video has a duration and a
 * position; a blueprint page has neither, so there is exactly one thing to report and it is
 * reported once.
 *
 * ⚠️ IT FIRES FOR SIGNED-OUT READERS TOO, and that is the point — most readers are. The route is
 * the only write on this surface that takes no session; the fingerprint is a per-day bucket key
 * derived server-side, never an identity, and it is pruned at 90 days.
 */
export default function BlueprintViewBeacon({
  arm,
  slug,
}: {
  readonly arm: BlueprintArm;
  readonly slug: string;
}) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;
    recordBlueprintViewOnce(arm, slug);
  }, [arm, slug]);

  return null;
}
