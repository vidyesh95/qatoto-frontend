// TRANSPORT: props-only — renders the receipt the claim mutation returned.
"use client";

import Link from "next/link";
import { useState } from "react";

import { MutationAcceptedNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import type { RightsClaimNotice } from "@/lib/blueprints/rights-claim-notice";
import type { RightsClaimReceipt } from "@/lib/blueprints/rights-claim.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

/**
 * THE TERMINAL SCREEN FOR A CLAIM THAT ARRIVED.
 *
 * ⚠️ A RECEIPT, NOT A VERDICT, AND NOT A FILING. The claim is stored and a moderator has not read
 * it; the teardown has not changed. Nothing here may name an outcome or promise a timescale, and
 * nothing may call this a statutory notice — Qatoto has designated no DMCA agent.
 *
 * ⚠️ IT DOES NOT POLL, for `submission-receipt.tsx`'s reason: a spinner implies somebody is reading
 * this minute, and a moderator reads a queue on their own schedule.
 *
 * ⚠️ THE NOTICE TEXT IS OFFERED TO COPY. The claimant used to keep the email they sent as their
 * record of when they gave notice; this is the same text, with the claim id beside it.
 */
export default function RightsClaimReceipt({
  receipt,
  notice,
  teardownHref,
}: {
  readonly receipt: RightsClaimReceipt;
  readonly notice: RightsClaimNotice;
  readonly teardownHref: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopyClick(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`Claim ${receipt.claimId}\n\n${notice.body}`);
      setCopyState("copied");
    } catch {
      // Reported, not swallowed — the `prepared-notice-panel.tsx` rule.
      setCopyState("failed");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium text-foreground lg:text-2xl">Your claim is with us</h1>

      <div className="mt-4">
        <MutationAcceptedNotice message="Qatoto has received your claim. A moderator will read it; nothing about the teardown has changed yet." />
      </div>

      <dl className="mt-4">
        <div className="border-t border-border/60 py-2">
          <dt className="text-xs tracking-wider text-muted-foreground uppercase">Claim</dt>
          <dd className="mt-0.5 font-mono text-sm text-foreground">{receipt.claimId}</dd>
        </div>
        <div className="border-t border-border/60 py-2">
          <dt className="text-xs tracking-wider text-muted-foreground uppercase">Received</dt>
          <dd className="mt-0.5 text-sm text-foreground">
            {formatIsoInstantLabel(receipt.receivedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 max-w-prose">
        <h2 className="text-sm font-medium text-foreground">What happens next</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A moderator reads it and decides whether to act on the teardown. There is no queue
          position to watch and nothing will email you; if they need more from you, they will reply
          to the address you gave.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your name and email are seen by Qatoto staff only, never by the person who published the
          teardown. Qatoto has not designated an agent for statutory copyright notices, so this
          reaches a person rather than being a formal filing.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCopyClick()}
          className="rounded-full border border-primary-imprint/40 px-5 py-2.5 text-sm font-medium text-primary-imprint transition-colors hover:bg-primary-imprint/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          Copy the claim for your records
        </button>
        <Link
          href={teardownHref}
          className="rounded-full px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          Back to the teardown
        </Link>
      </div>

      {copyState === "copied" ? (
        <output className="mt-3 block text-xs text-muted-foreground">
          Copied, with the claim id at the top.
        </output>
      ) : null}
      {copyState === "failed" ? (
        <output className="mt-3 block text-xs text-destructive">
          Your browser would not let the page copy that. Keep the claim id above as your record.
        </output>
      ) : null}
    </div>
  );
}
