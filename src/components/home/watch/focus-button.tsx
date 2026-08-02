"use client";

// TRANSPORT: client-query — PUT/DELETE `/creators/:creatorId/subscribe`.
//
// "Focus on" IS SUBSCRIBE. The label is Qatoto's word for it; the route, the table and the
// counter all call it a subscription, and `viewerState.isSubscribedToCreator` on the watch
// payload is what this button reflects on first paint.
//
// NOT OPTIMISTIC, unlike like and save. A subscription is a relationship: showing "Focused"
// before the server agrees means a viewer who lost their connection believes they are
// following a creator they are not, and finds out weeks later by never being notified. The
// button shows a pending state and then the server's own answer.

import Image from "next/image";
import { useState } from "react";

import { describeEngagementError, useCreatorSubscriptionMutation } from "@/hooks/feed/mutations";

export default function FocusButton({
  creatorId,
  isSubscribed: initialIsSubscribed,
}: {
  readonly creatorId: string;
  readonly isSubscribed: boolean;
}) {
  const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);
  const subscription = useCreatorSubscriptionMutation(creatorId);

  const iconSrc = `/icons/loupe_24dp_FFFFFF_FILL${isSubscribed ? 1 : 0}_wght400_GRAD0_opsz24.svg`;
  const refusal = subscription.error === null ? null : describeEngagementError(subscription.error);

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        aria-pressed={isSubscribed}
        disabled={subscription.isPending}
        onClick={() =>
          subscription.mutate(!isSubscribed, {
            onSuccess: (result) => setIsSubscribed(result.isSubscribed),
          })
        }
        className="flex shrink-0 cursor-pointer flex-row items-center gap-2 rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        <Image src={iconSrc} width={18} height={18} alt="" />
        {subscription.isPending ? "Working…" : isSubscribed ? "Focused" : "Focus on"}
      </button>
      {/*
        A 403 here is often "You cannot subscribe to your own channel" — a real, specific
        answer, so the backend's own message is surfaced verbatim rather than replaced with a
        generic failure line.
      */}
      {refusal !== null && (
        <p role="alert" className="max-w-60 text-right text-xs text-red-700">
          {refusal.message}
        </p>
      )}
    </div>
  );
}
