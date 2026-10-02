// TRANSPORT: props-only — renders an offer as links. No fetching.
"use client";

// ONE CARD FOR EVERY "HERE IS WHERE TO GO", WHOEVER OFFERED IT.
//
// The router's matches and a model reply's `destinationKey` render through this one component, so
// an offered place looks the same whether a table or a language model chose it. The difference is
// said in words, not in styling: a router card carries "Matched from your words. No model used."
// A model's card carries nothing extra, because the reply above it already shows a model answered.
//
// EVERY ACTION IS A LINK THE VIEWER TAPS. A place is its route from `ASSISTANT_DESTINATIONS`; a
// search is the real results page (`buildRouterSearchHref`), which runs the search when it opens.
// Nothing here navigates or fetches on its own.
//
// A TINT, NOT A BOX. The card sits inside the panel's bordered surface, so it is a `bg-muted` block
// rather than a second hairline frame (docs/Design.md §4, the Nested Panel Prohibition).

import Link from "next/link";

import { ASSISTANT_CHIP_CLASS_NAME } from "@/components/assistant/assistant-panel-sections";
import type { SavedRouterMatch } from "@/lib/assistant/assistant-conversation.schemas";
import { ASSISTANT_DESTINATIONS } from "@/lib/assistant/assistant-destinations";
import { buildRouterSearchHref } from "@/lib/assistant/assistant-router";
import { ASSISTANT_SEARCH_SCOPE_LABELS } from "@/lib/assistant/assistant-search";

const OPEN_LINK_CLASS_NAME =
  "shrink-0 cursor-pointer rounded-full bg-primary-imprint px-3.5 py-1.5 text-xs leading-4 font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint";

export default function AssistantActionCard({
  offer,
  isFromRouter,
  onNavigate,
}: {
  readonly offer: SavedRouterMatch;
  readonly isFromRouter: boolean;
  readonly onNavigate: () => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl bg-muted px-3 py-2.5">
      <AssistantActionCardBody offer={offer} onNavigate={onNavigate} />
      {isFromRouter && (
        <p className="text-xs leading-4 text-muted-foreground">
          Matched from your words. No model used.
        </p>
      )}
    </div>
  );
}

function AssistantActionCardBody({
  offer,
  onNavigate,
}: {
  readonly offer: SavedRouterMatch;
  readonly onNavigate: () => void;
}) {
  switch (offer.kind) {
    case "destination": {
      const destination = ASSISTANT_DESTINATIONS[offer.destinationKey];
      return (
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm leading-5 font-medium text-foreground">
            {destination.label}
          </span>
          <Link href={destination.href} onClick={onNavigate} className={OPEN_LINK_CLASS_NAME}>
            Open<span className="sr-only"> {destination.label}</span>
          </Link>
        </div>
      );
    }
    case "search": {
      const searchLabel = `Search ${ASSISTANT_SEARCH_SCOPE_LABELS[offer.scope]} for “${offer.query}”`;
      return (
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm leading-5 font-medium break-words text-foreground">
            {searchLabel}
          </span>
          <Link
            href={buildRouterSearchHref(offer.scope, offer.query)}
            onClick={onNavigate}
            className={OPEN_LINK_CLASS_NAME}
          >
            Open<span className="sr-only">: {searchLabel}</span>
          </Link>
        </div>
      );
    }
    case "choices":
      return (
        <div className="space-y-1.5">
          <p className="text-xs leading-4 font-medium text-foreground">Did you mean</p>
          <ul className="flex flex-wrap gap-1.5">
            {offer.destinationKeys.map((destinationKey) => (
              <li key={destinationKey}>
                <Link
                  href={ASSISTANT_DESTINATIONS[destinationKey].href}
                  onClick={onNavigate}
                  className={ASSISTANT_CHIP_CLASS_NAME}
                >
                  {ASSISTANT_DESTINATIONS[destinationKey].label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    default: {
      const exhaustiveCheck: never = offer;
      return exhaustiveCheck;
    }
  }
}
