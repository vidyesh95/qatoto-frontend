// TRANSPORT: client-query — `POST /feedback` through `useSendPlatformFeedbackMutation`.
"use client";

// ⚠️ **THIS PROMISES NOTHING BACK, AND NO COPY HERE MAY START TO.**
//
// The report sheets beside this one end in a moderator's verdict, so their receipts are
// careful to say a row exists rather than that anything was decided. Feedback has an easier
// problem and a subtler trap: there is no verdict at all, so the temptation is the friendly
// lie — "we'll get back to you", "your request has been logged and prioritised". Nothing in
// this system sends a reply or ranks anything, so both are inventions. Thanks, and the truth
// that a person reads it, is the ceiling.
//
// IT LIVES IN `home/shared/` BECAUSE ITS TRIGGER DOES. `AccountMenu` is mounted by the home,
// studio and admin navbars alike, so this sheet opens over all three shells; filing it under
// any one of them would make the other two import across surfaces for their own chrome.

import { useState } from "react";

import { usePathname } from "next/navigation";

import ModalSheet from "@/components/home/shared/modal-sheet";
import { useSendPlatformFeedbackMutation } from "@/hooks/platform/feedback";
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  PLATFORM_FEEDBACK_CATEGORIES,
  PLATFORM_FEEDBACK_CATEGORY_LABELS,
  type PlatformFeedbackCategory,
} from "@/lib/platform/feedback.api";

type FeedbackState =
  | { status: "composing" }
  | { status: "sending" }
  | { status: "received" }
  | { status: "refused"; message: string };

export default function SendFeedbackSheet({ onClose }: { readonly onClose: () => void }) {
  // The route this was written on. Read here rather than typed by the person: a note saying
  // "this button does nothing" is unactionable without it, and asking them where they are is
  // asking them to do the client's job.
  const pagePath = usePathname();

  const [selectedCategory, setSelectedCategory] = useState<PlatformFeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({ status: "composing" });

  const sendFeedbackMutation = useSendPlatformFeedbackMutation();

  const trimmedMessage = message.trim();
  // A courtesy, not validation — the server re-checks all of it, and the column re-checks the
  // server. It exists so the button is not offered for a submission that cannot succeed.
  const isReadyToSend = selectedCategory !== null && trimmedMessage !== "";

  async function handleSendClick() {
    if (selectedCategory === null || trimmedMessage === "") return;
    setFeedbackState({ status: "sending" });

    const result = await sendFeedbackMutation.mutateAsync({
      category: selectedCategory,
      message: trimmedMessage,
      pagePath,
    });

    if (result.success) {
      setFeedbackState({ status: "received" });
      return;
    }
    // The server's own sentence, verbatim. A 429 says how this was refused far better than a
    // generic failure does, and paraphrasing it would only lose that.
    setFeedbackState({ status: "refused", message: result.error.message });
  }

  return (
    <ModalSheet title="Send feedback" onClose={onClose}>
      <div className="px-4 pb-5">
        {feedbackState.status === "received" ? (
          <div>
            <p className="text-sm text-foreground">Thanks — your feedback helps improve Qatoto.</p>
            {/* NOT "we'll be in touch". Nothing here sends a reply. */}
            <p className="mt-1 text-xs text-muted-foreground">
              We read what comes in, but we cannot reply to every note.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              This is about Qatoto itself. To report a video, a profile or a listing, use the report
              control on that item instead.
            </p>

            <fieldset className="mt-3">
              <legend className="text-xs font-medium text-muted-foreground">
                What is this about?
              </legend>
              <ul className="mt-1 flex flex-col gap-1">
                {PLATFORM_FEEDBACK_CATEGORIES.map((category) => (
                  <li key={category}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="platform-feedback-category"
                        checked={selectedCategory === category}
                        onChange={() => {
                          setSelectedCategory(category);
                          setFeedbackState({ status: "composing" });
                        }}
                        className="size-4 cursor-pointer accent-primary"
                      />
                      <span className="text-sm text-foreground">
                        {PLATFORM_FEEDBACK_CATEGORY_LABELS[category]}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <label className="mt-3 block">
              <span className="text-xs font-medium text-muted-foreground">
                What&rsquo;s on your mind?
              </span>
              <textarea
                value={message}
                onChange={(changeEvent) => setMessage(changeEvent.target.value)}
                rows={5}
                maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
                placeholder="Tell us what happened, or what would make this better."
                className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <span className="mt-1 block text-right text-[11px] text-muted-foreground">
                {message.length}/{FEEDBACK_MESSAGE_MAX_LENGTH}
              </span>
            </label>

            {/* SAID BEFORE THEY SEND IT, not in the receipt. Somebody who would rather not
                attach the page they are on deserves to know before they write. */}
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              The page you are on ({pagePath}) and your browser details are sent along, so we can
              see where you were.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!isReadyToSend || feedbackState.status === "sending"}
                onClick={() => void handleSendClick()}
                className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {feedbackState.status === "sending" ? "Sending…" : "Send feedback"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer text-sm font-medium text-foreground underline"
              >
                Cancel
              </button>
            </div>

            {feedbackState.status === "refused" && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {feedbackState.message}
              </p>
            )}
          </>
        )}
      </div>
    </ModalSheet>
  );
}
