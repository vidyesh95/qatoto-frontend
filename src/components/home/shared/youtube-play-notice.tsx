// TRANSPORT: props-only — static copy. No directive, so both the server and client facades can use it.

import Link from "next/link";

/**
 * The one line every YouTube poster facade shows before playback: the still above it came from
 * YouTube, and pressing play is what loads YouTube's player. It claims nothing more, because the
 * still is itself a request to YouTube's image host.
 *
 * SHOWN TO EVERY VIEWER, NOT ONLY TO EU ONES. Geo-gating it was considered and rejected on
 * 2026-10-02 (todo.md §7): a hand-kept country list goes stale, an unknown-country header has to
 * fail closed, and the header a CDN sets is forgeable once the site moves hosts. One sentence is
 * honest under every regime and costs nothing.
 *
 * A SIBLING OF THE PLAY BUTTON, NEVER A CHILD. It holds a link, and a link inside a `<button>` is
 * invalid. The strip is `pointer-events-none` so a click on its gradient still reaches the button
 * underneath; only the link takes pointer events back. It sits at the TOP of the poster because the
 * bottom-right corner already belongs to the duration badge.
 *
 * `id` is what the play button's `aria-describedby` points at, so a screen reader hears the notice
 * with the button rather than after it. The caller passes a `useId()` value: a page can hold two
 * players, and two elements sharing one id would describe both buttons with whichever came first.
 */
export default function YoutubePlayNotice({ id }: { readonly id: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/70 to-transparent px-3 pt-2 pb-6">
      <p id={id} className="text-xs leading-5 text-white/85">
        Plays from YouTube. Pressing play loads YouTube&apos;s player.{" "}
        <Link
          href="/privacy-policy#cookies-and-storage"
          className="pointer-events-auto underline hover:text-white"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
