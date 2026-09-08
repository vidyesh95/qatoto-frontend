// TRANSPORT: props-only — the Components tab's part list. Selecting a row isolates that part in
// the stage; the frame loop does the hiding.

"use client";

import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";
import { manufacturingMethodLabel } from "@/lib/blueprints/format";
import type { TeardownPart } from "@/lib/blueprints/schemas";

export interface PartBrowserRailProps {
  readonly store: ExplosionStore;
  readonly parts: readonly TeardownPart[];
  readonly isInteractive: boolean;
  /**
   * Baked once by the engine when this tab first opens, and EMPTY IS A NORMAL STATE — before the
   * bake runs, if the renderer never loaded, or if the 2D context was refused. A row without a
   * thumbnail renders as it always did.
   */
  readonly thumbnailsByPartId: ReadonlyMap<string, string>;
}

/**
 * A LIST BESIDE THE STAGE, and the caption for the isolated part below it.
 *
 * The thumbnails are RENDERED FROM THE MODEL ALREADY IN MEMORY, at the stage's own viewing angle,
 * by one offscreen pass the first time this tab opens — never uploaded, never fetched, and never a
 * second live canvas per row. See `part-thumbnail-baker.tsx` for why that shape.
 */
export default function PartBrowserRail({
  store,
  parts,
  isInteractive,
  thumbnailsByPartId,
}: PartBrowserRailProps) {
  const { selectedPartId } = useExplosionSnapshot(store);
  const selectedPart = parts.find((part) => part.id === selectedPartId);

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
      <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
        {parts.map((part) => {
          const isSelected = part.id === selectedPartId;
          return (
            <li key={part.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={!isInteractive}
                onClick={() => store.selectPart(isSelected ? null : part.id)}
                className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-[#00696E] bg-[#00696E]/8"
                    : "border-[#CAC4D0]/60 hover:border-[#00696E]/40"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <PartThumbnail
                    thumbnailDataUrl={thumbnailsByPartId.get(part.id) ?? null}
                    label={part.label}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{part.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[#6F7979]">
                      {manufacturingMethodLabel(part.manufacturingMethod)}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
        {selectedPart === undefined ? (
          <p className="text-sm text-[#6F7979]">
            Pick a component to see it on its own, with what it is made from and how.
          </p>
        ) : (
          <>
            <p className="font-mono text-[10px] tracking-[0.12em] text-[#6F7979] uppercase">
              {manufacturingMethodLabel(selectedPart.manufacturingMethod)}
            </p>
            <p className="mt-1 text-base font-medium text-foreground">{selectedPart.label}</p>
            <p className="mt-0.5 text-sm leading-6 text-foreground">{selectedPart.material}</p>
            {/* `null` is "nobody rated it", which is not the same as a rating of zero. */}
            <p className="mt-2 font-mono text-[11px] text-[#6F7979] tabular-nums">
              {selectedPart.stressRating === null
                ? "Not simulated"
                : `${Math.round(selectedPart.stressRating * 100)}% of yield, author-reported`}
            </p>
            {selectedPart.calloutText === null ? null : (
              <p className="mt-2 text-sm leading-6 text-foreground/80">
                {selectedPart.calloutText}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * ⚠️ A PLAIN `<img>`, NOT `next/image`. The source is a `data:` URL produced in this browser
 * moments ago — there is no origin to optimise it from, no size known at build time, and routing it
 * through the image optimiser would be a network round trip to re-encode bytes we already hold.
 *
 * The reserved box is rendered even with no thumbnail, so a row does not resize under the reader
 * when the bake lands.
 */
function PartThumbnail({
  thumbnailDataUrl,
  label,
}: {
  readonly thumbnailDataUrl: string | null;
  readonly label: string;
}) {
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-[#CAC4D0]/50 bg-[#F4F6F6]">
      {thumbnailDataUrl === null ? null : (
        // oxlint-disable-next-line no-img-element
        <img src={thumbnailDataUrl} alt="" aria-hidden width={40} height={40} loading="lazy" />
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}
