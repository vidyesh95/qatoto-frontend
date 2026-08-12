import type { Metadata } from "next";

import ThreadInbox from "@/components/commerce/thread-inbox";

// Permanently dynamic: session-scoped. The inbox never reaches a server render, so there is no
// Cache Components refactor to do here.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Messages",
  description: "Your Qatoto conversations",
};

/**
 * THE INBOX A38 SHIPPED THE READ FOR.
 *
 * Before `GET /commerce/threads`, a conversation was reachable only in the session that opened it —
 * `POST /commerce/threads` returned an id and nothing else ever yielded one. That absence also made
 * §14's settlement agreements dead, since their routes are keyed on the same id.
 */
export default function MessagesRoute() {
  return <ThreadInbox />;
}
