// TRANSPORT: props-only — renders a notice built by `@/lib/blueprints/rights-claim-notice`.
"use client";

import Link from "next/link";
import { useState } from "react";

import type { RightsClaimNotice } from "@/lib/blueprints/rights-claim-notice";
import type { EmailedNoticeFallbackReason } from "@/lib/blueprints/rights-claim-refusal";

/**
 * Why the claim did not arrive, said first, because it decides which of the two ways forward the
 * claimant takes: send it again, or send it by email.
 */
function describeFallbackReason(fallbackReason: EmailedNoticeFallbackReason): string {
  switch (fallbackReason) {
    case "unreachable":
      return "We could not reach Qatoto to send your claim, so it has not been received.";
    case "rateLimited":
      return "You have sent several claims in a short time, so this one was not accepted yet.";
    case "signInRequired":
      return "Sending a claim through the site needs a Qatoto account, and you are not signed in.";
    default: {
      const exhaustiveCheck: never = fallbackReason;
      return exhaustiveCheck;
    }
  }
}

/**
 * THE EMAILED NOTICE — the fallback when a claim could not be sent through the site.
 *
 * ⚠️ THERE IS NO RECEIPT HERE BECAUSE NOTHING WAS RECEIVED. The receipt lives in
 * `rights-claim-receipt.tsx` and only a 201 reaches it. This screen ends on a DOCUMENT the claimant
 * can send themselves, and says plainly that Qatoto does not have it: a rights holder who believes
 * the platform is on notice when it is not may miss a deadline.
 *
 * ⚠️ THE NOTICE IS SHOWN IN FULL AND IS SELECTABLE. Not summarised, not behind a disclosure, not in
 * a fixed-height box that scrolls two lines at a time. What the claimant is about to send is the
 * thing they must be able to read and check, and a mail client may mangle a long `mailto:` — the
 * visible text plus the copy button is the path that always works.
 *
 * ⚠️ ONLY "Send it again" IS A SUBMIT, and it resends the SAME attempt: the idempotency key is
 * unchanged, so if the first request did arrive the server answers with that receipt rather than
 * storing a second claim. The mail button hands the notice to the visitor's own client and the copy
 * button puts it on their clipboard; both leave Qatoto with nothing.
 */
export default function PreparedNoticePanel({
  notice,
  fallbackReason,
  onRetrySubmit,
  onReviseNotice,
}: {
  readonly notice: RightsClaimNotice;
  readonly fallbackReason: EmailedNoticeFallbackReason;
  /** Sends the same claim again with the same idempotency key — safe if the first did arrive. */
  readonly onRetrySubmit: () => void;
  readonly onReviseNotice: () => void;
}) {
  /**
   * `idle | copied` rather than a boolean plus a timer, and it never resets itself.
   *
   * A confirmation that vanishes after two seconds is one somebody looking at their mail client
   * misses entirely, and then they copy twice and wonder which one took. It clears when they revise.
   */
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopyClick(): Promise<void> {
    try {
      await navigator.clipboard.writeText(notice.body);
      setCopyState("copied");
    } catch {
      // ⚠️ A REFUSED CLIPBOARD IS REPORTED, NOT SWALLOWED. `navigator.clipboard` rejects without a
      // user gesture, over plain http, and under some permission policies — and the notice is
      // already visible above, so the honest fallback is "select it yourself" rather than a button
      // that silently did nothing.
      setCopyState("failed");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium text-foreground lg:text-2xl">
        Your claim has not been sent
      </h1>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">
          {describeFallbackReason(fallbackReason)}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Qatoto does not have a copy of this. You can{" "}
          {fallbackReason === "signInRequired" ? (
            <>
              <Link
                href="/sign-in"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-imprint underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
              >
                sign in in a new tab
              </Link>{" "}
              and send it again from here, or
            </>
          ) : (
            "try sending it again in a few minutes, or"
          )}{" "}
          send the notice below by email instead.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Send it to <span className="font-medium text-foreground">{notice.recipientEmail}</span>.
          Keep a copy: it is the record of when you gave notice.
        </p>
      </div>

      <div className="mt-5">
        <p className="text-xs tracking-wider text-muted-foreground uppercase">Subject</p>
        <p className="mt-1 text-sm text-foreground">{notice.subject}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs tracking-wider text-muted-foreground uppercase">Notice</p>
        {/*
          `whitespace-pre-wrap` because the body is plain text with meaningful line breaks, and a
          `<pre>` would scroll horizontally on a phone. Sans rather than mono: this is a letter
          somebody reads, not a value they copy exactly.
        */}
        <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-foreground">{notice.body}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
        {/*
          A plain `<a>`, never `next/link`: a `mailto:` is not a route and handing it to the client
          router does nothing. Same call `privacy-request.ts`'s consumers make.
        */}
        <a
          href={notice.mailtoHref}
          className="rounded-full bg-primary-imprint px-5 py-2.5 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          Open this in my email
        </a>
        <button
          type="button"
          onClick={() => void handleCopyClick()}
          className="rounded-full border border-primary-imprint/40 px-5 py-2.5 text-sm font-medium text-primary-imprint transition-colors hover:bg-primary-imprint/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          Copy the notice
        </button>
        <button
          type="button"
          onClick={onRetrySubmit}
          className="rounded-full border border-primary-imprint/40 px-5 py-2.5 text-sm font-medium text-primary-imprint transition-colors hover:bg-primary-imprint/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          Send it again
        </button>
        <button
          type="button"
          onClick={() => {
            setCopyState("idle");
            onReviseNotice();
          }}
          className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          Change something
        </button>
      </div>

      {copyState === "copied" ? (
        <output className="mt-3 block text-xs text-muted-foreground">
          Copied. Paste it into an email to {notice.recipientEmail}.
        </output>
      ) : null}
      {copyState === "failed" ? (
        <output className="mt-3 block text-xs text-destructive">
          Your browser would not let the page copy that. Select the notice above and copy it
          yourself.
        </output>
      ) : null}

      <p className="mt-5 max-w-prose text-xs leading-5 text-muted-foreground">
        Qatoto has not designated an agent for statutory copyright notices, so this is how to reach
        a person rather than a formal filing. What happens next is a human reading your email.
        Nothing on the teardown changes until somebody has.
      </p>
    </div>
  );
}
