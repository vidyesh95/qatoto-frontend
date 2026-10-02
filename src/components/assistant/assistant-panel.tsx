// TRANSPORT: props-only — renders authored constants.
"use client";

// THE ASSISTANT'S PANEL, PART 1: WHERE THINGS ARE, WITHOUT A MODEL.
//
// There is no language model behind this yet, so the panel does the one helping job that needs
// none: it lists every working destination, grouped by who the reader is. The groups and links are
// `ROADMAP_AUDIENCES`, which already guarantees every `href` is a route that works — a capability
// on a stub or a dynamic segment carries no route there, so it cannot appear here as a dead link.
//
// The copy says plainly that questions are not answered yet. A text box that went nowhere would be
// the control-with-no-backing-write the design system forbids.
//
// NON-MODAL. No scrim, no focus trap: it is a helper beside the page, and the page stays usable.
// Escape closes it and returns focus to the mascot's button, which `assistant-root.tsx` owns.

import { useEffect, useRef } from "react";

import Image from "next/image";
import Link from "next/link";

import { ROADMAP_AUDIENCES, type CapabilityRoute } from "@/lib/roadmap/site-capabilities";

interface AssistantDestinationGroup {
  readonly audienceId: string;
  readonly headline: string;
  readonly routes: readonly CapabilityRoute[];
}

/** One chip per href per audience: several capabilities share a destination (Build log, Talent). */
const ASSISTANT_DESTINATION_GROUPS: readonly AssistantDestinationGroup[] = ROADMAP_AUDIENCES.map(
  (audience) => {
    const routesByHref = new Map<string, CapabilityRoute>();
    for (const capability of audience.capabilities) {
      for (const route of capability.routes) {
        if (!routesByHref.has(route.href)) routesByHref.set(route.href, route);
      }
    }
    return {
      audienceId: audience.id,
      headline: audience.headline,
      routes: [...routesByHref.values()],
    };
  },
).filter((destinationGroup) => destinationGroup.routes.length > 0);

export const ASSISTANT_PANEL_ID = "qatoto-assistant-panel";

export default function AssistantPanel({ onClose }: { readonly onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      id={ASSISTANT_PANEL_ID}
      aria-labelledby={`${ASSISTANT_PANEL_ID}-heading`}
      className="fixed inset-x-3 bottom-52 z-40 flex max-h-[60dvh] flex-col rounded-xl border border-border bg-background shadow-lg md:inset-x-auto md:right-6 md:bottom-40 md:w-80"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2
          ref={headingRef}
          id={`${ASSISTANT_PANEL_ID}-heading`}
          tabIndex={-1}
          className="text-sm font-medium text-foreground focus:outline-none"
        >
          Qatoto assistant
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
        >
          <Image
            src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
        </button>
      </header>

      <div className="overflow-y-auto px-4 py-3">
        <p className="text-xs leading-4 text-muted-foreground">
          It does not answer questions yet. These are the places it can take you, grouped by what
          you came to do.
        </p>

        {ASSISTANT_DESTINATION_GROUPS.map((destinationGroup) => (
          <section key={destinationGroup.audienceId} className="mt-3">
            <h3 className="text-xs leading-4 font-medium text-muted-foreground">
              {destinationGroup.headline}
            </h3>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {destinationGroup.routes.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    onClick={onClose}
                    className="inline-block rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs leading-4 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
                  >
                    {route.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
