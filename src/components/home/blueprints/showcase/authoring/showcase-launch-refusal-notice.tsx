// TRANSPORT: props-only — renders one refusal the server gave a launch.

import Link from "next/link";

import type { ShowcaseLaunchRefusal } from "@/components/home/blueprints/showcase/authoring/showcase-launch-shared";

const NOTICE_CLASS = "rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800";
const NOTICE_LINK_CLASS =
  "font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]";

/**
 * What went wrong with a post, and what to do about it.
 *
 * ⚠️ THE THREE FIELD REFUSALS RENDER NOTHING HERE. A taken name, a refused image and refused fields are
 * listed in the composer's summary box beside the field they name; repeating them here would print
 * the same sentence twice.
 *
 * ⚠️ LINKS OPEN A NEW TAB, so the draft and the picked image on this page survive a sign-in or a look
 * at My Launches.
 */
export default function ShowcaseLaunchRefusalNotice({
  refusal,
}: {
  readonly refusal: ShowcaseLaunchRefusal;
}) {
  switch (refusal.kind) {
    case "signInRequired":
      return (
        <div role="alert" className={NOTICE_CLASS}>
          Your session ended, so the launch was not posted.{" "}
          <Link
            href="/sign-in"
            target="_blank"
            rel="noopener noreferrer"
            className={NOTICE_LINK_CLASS}
          >
            Sign in in a new tab
          </Link>
          , then come back and press Post launch. Your draft and image stay on this page.
        </div>
      );
    case "accountIncomplete":
      return (
        <div role="alert" className={NOTICE_CLASS}>
          {refusal.message}
        </div>
      );
    case "submissionAlreadyReceived":
      return (
        <div role="alert" className={NOTICE_CLASS}>
          Qatoto already has a launch from this attempt.{" "}
          <Link
            href="/studio/launches"
            target="_blank"
            rel="noopener noreferrer"
            className={NOTICE_LINK_CLASS}
          >
            Check My Launches
          </Link>{" "}
          before you post it again.
        </div>
      );
    case "headingImageTooLarge":
      return (
        <div role="alert" className={NOTICE_CLASS}>
          The heading image is over the 5 MB limit. Export a smaller file and pick it again.
        </div>
      );
    case "rateLimited":
      return (
        <div role="alert" className={NOTICE_CLASS}>
          You have posted several launches in a short time. Wait a few minutes, then post again.
        </div>
      );
    case "replyUnreadable":
      return (
        <div role="alert" className={NOTICE_CLASS}>
          Qatoto answered, but this page could not read the reply, so your launch may already be
          saved.{" "}
          <Link
            href="/studio/launches"
            target="_blank"
            rel="noopener noreferrer"
            className={NOTICE_LINK_CLASS}
          >
            Check My Launches
          </Link>{" "}
          before you post it again.
        </div>
      );
    case "unexpected":
      return (
        <div role="alert" className={NOTICE_CLASS}>
          <p>{refusal.message}</p>
          <p className="mt-1 text-xs">Code {refusal.code}</p>
        </div>
      );
    case "launchNameConflict":
    case "headingImageRefused":
    case "fieldsRefused":
      return null;
    default: {
      const exhaustiveCheck: never = refusal;
      return exhaustiveCheck;
    }
  }
}
