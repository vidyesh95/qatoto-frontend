// TRANSPORT: client-query — `POST /feedback`, the site-wide feedback box.
//
// IT IS NOT A REPORT, AND THE COPY BUILT ON IT MUST NOT READ LIKE ONE. Every other write of
// this shape in the app is about a person or a piece of content and ends in a moderator's
// verdict about it. This one ends in nobody being judged, so there is no queue position to
// promise, no outcome to report back and no appeal to offer.
//
// WHAT THE CLIENT SENDS IS THE WHOLE BODY: a category, a message, and the path the person
// was on. The browser string is read from the request header by the server — never sent from
// here, because a body-carried user agent is a value this untrusted client chooses.

import { z } from "zod";

import { sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";

/**
 * Byte-identical to the backend's `platform_feedback_category` pgEnum.
 *
 * SNAKE_CASE-SAFE SINGLE TOKENS, and not to be "corrected" to kebab. These are Postgres enum
 * labels sent verbatim; a re-spelled value is a 422 from a `.strict()` schema, not an ignored
 * one.
 */
export const PLATFORM_FEEDBACK_CATEGORIES = ["bug", "idea", "other"] as const;

export const PlatformFeedbackCategorySchema = z.enum(PLATFORM_FEEDBACK_CATEGORIES);
export type PlatformFeedbackCategory = z.infer<typeof PlatformFeedbackCategorySchema>;

/** What somebody picks from, in the order the sheet shows them. */
export const PLATFORM_FEEDBACK_CATEGORY_LABELS: Readonly<Record<PlatformFeedbackCategory, string>> =
  {
    bug: "Something is broken",
    idea: "An idea or improvement",
    other: "Something else",
  };

/**
 * Mirrors `platform_feedback_message_ck`, so the textarea stops where the column does and the
 * server never has to refuse a note for its length.
 */
export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

const FeedbackReceivedSchema = z.object({ feedbackId: z.string() }).strip();
export type FeedbackReceived = z.infer<typeof FeedbackReceivedSchema>;

export interface SendPlatformFeedbackInput {
  readonly category: PlatformFeedbackCategory;
  readonly message: string;
  /** The route the person was looking at, read from `usePathname()` at submit time. */
  readonly pagePath: string;
}

/**
 * Files one piece of feedback.
 *
 * A 201 MEANS A ROW EXISTS. It does not mean anybody has read it, and no copy on this
 * surface may say a reply is coming — nothing in this system sends one.
 */
export function sendPlatformFeedback(
  input: SendPlatformFeedbackInput,
  options?: RequestOptions,
): Promise<ActionResponse<FeedbackReceived>> {
  return sendJson("/feedback", "POST", input, FeedbackReceivedSchema, options);
}
