// TRANSPORT: client-query — "use client" island calling useSendWorkshopChatMessageMutation.
// One write: POST …/workshop/chat.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useSendWorkshopChatMessageMutation } from "@/hooks/rnd/workshop";
import { ApiRequestError } from "@/lib/http";

/**
 * The chat composer, returned.
 *
 * PHASE 3 DELETED IT rather than leaving it faked: it appended to `useState` and nothing
 * left the browser, so a member could believe they had told their team something they had
 * not. It is back now because the write it needs is real.
 *
 * NOT OPTIMISTIC, AND NOT REAL-TIME. The transcript is POLLED — SSE is deferred on the
 * 20-connection Postgres budget, not on cost — so the message appears when the next read
 * returns it. Rendering an instant bubble would claim a delivery this transport cannot
 * make.
 */
export default function WorkshopChatComposer({ projectSlug }: { projectSlug: string }) {
  const sendMutation = useSendWorkshopChatMessageMutation(projectSlug);
  const [bodyText, setBodyText] = useState("");

  const sendError =
    sendMutation.error instanceof ApiRequestError ? sendMutation.error.apiError : null;

  return (
    <form
      className="space-y-2"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        sendMutation.mutate(bodyText, { onSuccess: () => setBodyText("") });
      }}
    >
      <textarea
        required
        rows={2}
        value={bodyText}
        onChange={(changeEvent) => setBodyText(changeEvent.target.value)}
        placeholder="Message your team"
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={sendMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {sendMutation.isPending ? "Sending…" : "Send"}
        </button>
        <span className="text-xs text-muted-foreground">
          Messages appear when the transcript refreshes — this chat is polled, not live.
        </span>
      </div>
      {sendError !== null && <MutationErrorNotice error={sendError} />}
    </form>
  );
}
