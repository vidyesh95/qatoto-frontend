// TRANSPORT: client-query — the unread badge and the inbox dropdown.
"use client";

// THE BELL THAT WAS DECORATION. Three navbars shipped a `<button aria-label="Notifications">` with
// no `onClick` while `GET /notifications` had been live and caller-scoped the whole time. This is
// that button, with the read behind it.
//
// ONE COMPONENT FOR ALL THREE SURFACES. The read carries no project filter and no scope parameter
// — it is the caller's inbox and nothing else — so `(home)`, `(studio)` and `(admin)` want exactly
// the same thing. The trigger markup is kept byte-for-byte from what it replaces so no surface
// shifts by a pixel.
//
// THE SIGNED-OUT GATE IS OWNED HERE, not assumed from the caller. Two of the three call sites sit
// inside their cluster's `isAuthenticated` branch, but the STUDIO bell lives in `StudioNavbar`
// itself, outside `accountSlot`, so it renders for anyone. `isViewerSignedIn` therefore defaults
// to `false` — the server's answer where a caller has one, and the safe assumption where it does
// not, since `useViewerSignedIn` lets the live session overrule it once that lands.
//
// THE LIST HOOK IS MOUNTED WITH THE PANEL, NOT THE BELL. `useKeysetList` has no `enabled` switch,
// so the only way to not fetch an inbox nobody opened is to not render the component that asks
// for one. Same reason `CartNavButton` is a component rather than a hook call inside `Navbar`.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import RelativeTime from "@/components/home/shared/relative-time";
import {
  useDiscardNotificationListOnUnmount,
  useMarkNotificationsReadMutation,
  useNotificationListQuery,
  useUnreadNotificationCountQuery,
} from "@/hooks/notifications";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import { buildNotificationHref, buildNotificationSentence } from "@/lib/notifications/format";
import type { NotificationRow } from "@/lib/notifications/schemas";

/** Above this the badge reads `99+`, so a long backlog cannot deform the navbar row. */
const MAXIMUM_DISPLAYED_UNREAD_COUNT = 99;

export default function NotificationBell({
  isViewerSignedIn = false,
}: {
  /**
   * What the SERVER saw, from `hasCallerSession()`, where the call site has it.
   *
   * Defaulting to `false` is not a placeholder: it is the correct first paint for an anonymous
   * visitor, and a signed-in one gets the badge as soon as the live session resolves. The studio
   * navbar has no such prop to pass, which is the case this default exists for.
   */
  readonly isViewerSignedIn?: boolean;
}) {
  const isAuthenticated = useViewerSignedIn(isViewerSignedIn);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const bellContainerRef = useRef<HTMLDivElement>(null);

  const unreadCountQuery = useUnreadNotificationCountQuery(isAuthenticated);

  // ABSENT, NEVER ZERO, UNTIL THE SERVER HAS SPOKEN. Pending, thrown, refused and genuinely-read
  // all collapse to the same bare icon — a "0" painted during load is a claim about someone's
  // inbox that the client has not earned.
  const unreadCountResult = unreadCountQuery.data;
  const unreadCount =
    unreadCountResult !== undefined &&
    unreadCountResult.success &&
    unreadCountResult.data.unreadCount > 0
      ? unreadCountResult.data.unreadCount
      : null;

  // Mirrors `account-menu.tsx`: mousedown rather than click, so a press that starts outside the
  // panel closes it before the release lands on whatever is underneath.
  useEffect(() => {
    // `undefined` rather than a bare `return`: both arms of an effect have to agree on whether
    // they produce a cleanup, and a closed panel registers no listener to tear down.
    if (!isPanelOpen) return undefined;

    const handlePointerDownOutside = (pointerEvent: MouseEvent) => {
      const pressTarget = pointerEvent.target;
      const pressedOutsideBell =
        pressTarget instanceof Node &&
        bellContainerRef.current !== null &&
        !bellContainerRef.current.contains(pressTarget);

      if (pressedOutsideBell) setIsPanelOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    return () => document.removeEventListener("mousedown", handlePointerDownOutside);
  }, [isPanelOpen]);

  return (
    <div className="relative" ref={bellContainerRef}>
      <button
        type={"button"}
        // The count is in the accessible name rather than left to the badge, which is
        // `aria-hidden` below — a screen reader should hear "Notifications, 3 unread" once.
        aria-label={unreadCount === null ? "Notifications" : `Notifications, ${unreadCount} unread`}
        aria-expanded={isPanelOpen}
        onClick={() => setIsPanelOpen((isOpen) => !isOpen)}
        className={"relative cursor-pointer rounded-full border border-primary bg-white p-1.75"}
      >
        <Image
          src={"/icons/notifications_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
          alt={""}
          width={24}
          height={24}
        />
        {unreadCount !== null && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full bg-[#00696E] px-1 text-[10px] leading-4 font-medium text-white"
          >
            {unreadCount > MAXIMUM_DISPLAYED_UNREAD_COUNT
              ? `${MAXIMUM_DISPLAYED_UNREAD_COUNT}+`
              : unreadCount}
          </span>
        )}
      </button>

      {isPanelOpen &&
        (isAuthenticated ? (
          <NotificationPanel />
        ) : (
          <NotificationPanelShell>
            <p className="px-4 py-6 text-sm text-muted-foreground">
              <Link href="/sign-in" className="underline">
                Sign in
              </Link>{" "}
              to see your notifications.
            </p>
          </NotificationPanelShell>
        ))}
    </div>
  );
}

/**
 * The dropdown chrome, shared by the signed-out message and the inbox itself.
 *
 * A LABELLED `<section>`, not `role="menu"` — which is what the account dropdown beside it uses. A
 * `menu` owes assistive tech `menuitem` children and arrow-key roving focus, and this is a
 * scrollable list of links and a "show older" button; claiming the role would describe a keyboard
 * contract it does not honour. A labelled `section` takes the `region` role, so the panel has a
 * name a screen reader can announce and land on without any of that.
 */
function NotificationPanelShell({ children }: { readonly children: ReactNode }) {
  return (
    <section
      aria-label="Notifications"
      className="absolute right-0 z-50 mt-2 max-h-[32rem] w-88 overflow-y-auto rounded-xl border border-border bg-background shadow-lg"
    >
      <header className="sticky top-0 border-b border-border bg-background px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Notifications</h2>
      </header>
      {children}
    </section>
  );
}

/**
 * The inbox. Mounted only while the panel is open and the viewer is signed in, which is what
 * keeps the request from existing otherwise.
 */
function NotificationPanel() {
  const notificationList = useNotificationListQuery();
  const markNotificationsRead = useMarkNotificationsReadMutation().mutate;
  useDiscardNotificationListOnUnmount();

  // Which id has already been sent. NOT state — writing it would re-render, and the only question
  // it answers is "did this attempt already go out", which no rendered output depends on.
  const requestedMarkThroughIdRef = useRef<string | null>(null);

  // Newest first is the server's order, so row zero is the one everything else is "through".
  const newestNotificationId = notificationList.rows.at(0)?.id ?? null;

  useEffect(() => {
    if (newestNotificationId === null) return;
    if (requestedMarkThroughIdRef.current === newestNotificationId) return;

    // THROUGH the newest loaded row, one id — never a list. Fired on open rather than per row:
    // the panel showed them, so they have been seen. Nothing optimistic follows from it; the
    // badge clears only when the server answers.
    requestedMarkThroughIdRef.current = newestNotificationId;
    markNotificationsRead(newestNotificationId);
  }, [newestNotificationId, markNotificationsRead]);

  return <NotificationPanelShell>{renderPanelBody(notificationList)}</NotificationPanelShell>;
}

function renderPanelBody(notificationList: ReturnType<typeof useNotificationListQuery>) {
  if (notificationList.isLoadingFirstPage) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading your notifications…</p>;
  }

  if (notificationList.firstPageErrorMessage !== null) {
    // The backend's own message, verbatim — a `422 CURSOR_MALFORMED` is a real finding and must
    // not be swallowed into a silent restart at page one, which shows duplicates instead.
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        {notificationList.firstPageErrorMessage}
      </p>
    );
  }

  if (notificationList.rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Nothing yet.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {notificationList.rows.map((notification) => (
          <NotificationListItem key={notification.id} notification={notification} />
        ))}
      </ul>
      {notificationList.loadMoreErrorMessage !== null && (
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          {notificationList.loadMoreErrorMessage}
        </p>
      )}
      {notificationList.hasNextPage && (
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={notificationList.loadNextPage}
            disabled={notificationList.isFetchingNextPage}
            className="cursor-pointer text-sm text-foreground underline disabled:cursor-default disabled:text-muted-foreground"
          >
            {notificationList.isFetchingNextPage ? "Loading…" : "Show older"}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * One row.
 *
 * A row with no destination is TEXT, NOT A DEAD LINK — `buildNotificationHref` returns null where
 * there is nowhere the reader can honestly be sent, and this renders a `<div>` for those.
 */
function NotificationListItem({ notification }: { readonly notification: NotificationRow }) {
  const sentence = buildNotificationSentence(notification);
  const href = buildNotificationHref(notification);
  const isUnread = notification.readAt === null;

  const body = (
    <>
      <p className="text-sm leading-5 text-foreground">{sentence.headline}</p>
      {sentence.context !== null && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sentence.context}</p>
      )}
      <RelativeTime
        isoInstant={notification.createdAt}
        className="mt-1 block text-xs text-muted-foreground"
      />
    </>
  );

  return (
    <li className={isUnread ? "bg-foreground/[0.03]" : undefined}>
      {href === null ? (
        <div className="px-4 py-3">{body}</div>
      ) : (
        <Link href={href} className="block px-4 py-3 hover:bg-foreground/5">
          {body}
        </Link>
      )}
    </li>
  );
}
