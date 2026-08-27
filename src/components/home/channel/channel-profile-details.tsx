// TRANSPORT: props-only — renders a description and links somebody else fetched.
"use client";

// THE DESCRIPTION AND LINKS BLOCK, and it is deliberately ONE component used TWICE: the channel
// About sheet renders it for visitors, and the profile editor renders it as a live preview. That is
// what stops the preview drifting from the real page — the same argument `channel-page.tsx` makes
// about reusing the feed's own video projection rather than describing it a second time.
//
// IT RENDERS NOTHING WHEN BOTH ARE EMPTY. Not a heading with a blank underneath, not "Not provided"
// — nothing. An empty description is not a fact about a creator worth stating, and `about-sheet`'s
// facts list below it is still perfectly legible on its own.
//
// AN EMPTY VALUE HERE HAS TWO CAUSES — unset, or hidden by a moderator — and this component cannot
// tell them apart because the wire deliberately does not say. Do not add copy that guesses.

import type { ProfileLink } from "@/lib/channels/schemas";

export default function ChannelProfileDetails({
  bio,
  links,
}: {
  readonly bio: string | null;
  readonly links: readonly ProfileLink[];
}) {
  const trimmedBio = bio?.trim() ?? "";
  const hasBio = trimmedBio !== "";
  if (!hasBio && links.length === 0) return null;

  return (
    <div className="pb-4">
      {hasBio && (
        <>
          <h3 className="text-sm font-medium text-foreground">Description</h3>
          {/* `whitespace-pre-line` so the paragraph breaks the creator typed survive, without
              `pre` also preserving the leading indentation of a pasted block. */}
          <p className="mt-1 text-sm leading-5 whitespace-pre-line text-foreground">{trimmedBio}</p>
        </>
      )}

      {links.length > 0 && (
        <>
          <h3 className={`text-sm font-medium text-foreground ${hasBio ? "mt-4" : ""}`}>Links</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {links.map((link) => (
              <li key={`${link.url}-${link.label}`}>
                {/*
                  USER-SUPPLIED URL ON A PUBLIC PAGE, so all four rel tokens are load-bearing rather
                  than cargo: `noopener`/`noreferrer` stop the opened tab reaching back through
                  `window.opener`, `nofollow` refuses to lend this domain's ranking to whatever a
                  stranger pasted, and `ugc` says what it actually is. The scheme itself is already
                  guaranteed `https://` by a database CHECK, which is what keeps `javascript:` out.
                */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="text-sm text-primary underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
