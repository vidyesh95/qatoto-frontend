"use client";

import Image from "next/image";
import {
  PRODUCT_HIGHLIGHT_BODY_MAX_LENGTH,
  PRODUCT_HIGHLIGHT_MAX_COUNT,
  PRODUCT_HIGHLIGHT_TITLE_MAX_LENGTH,
  type HighlightDraft,
} from "../listing-editor-types";
import {
  HighlightImagePreview,
  StepCard,
  StepSectionHeader,
} from "../listing-editor-subcomponents";

export interface HighlightsStepProps {
  readonly highlights: readonly HighlightDraft[];
  readonly onAddHighlight: () => void;
  readonly onRemoveHighlight: (index: number) => void;
  readonly onHighlightTextChange: (
    index: number,
    field: "title" | "bodyText",
    value: string,
  ) => void;
  readonly onHighlightImageChange: (index: number, file: File | null) => void;
}

export function HighlightsStep({
  highlights,
  onAddHighlight,
  onRemoveHighlight,
  onHighlightTextChange,
  onHighlightImageChange,
}: HighlightsStepProps) {
  return (
    <StepCard
      title="Highlights"
      subtitle="The long-form part of your listing — a heading, a paragraph and a picture, repeated down the page."
    >
      <div className="flex flex-col gap-3">
        <StepSectionHeader
          title="Detail blocks"
          description="Optional. This is where a buyer reads what the photos cannot show — finish, tolerances, what is in the box."
          buttonLabel="Add block"
          onButtonClick={onAddHighlight}
          isButtonDisabled={highlights.length >= PRODUCT_HIGHLIGHT_MAX_COUNT}
        />

        {highlights.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No detail blocks yet. Your listing still publishes without them — they are the part
            buyers scroll through once the photos have their attention.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {highlights.map((highlight, highlightIndex) => (
              <li
                key={highlight.localId}
                className="flex flex-col gap-3 rounded-xl border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Block {highlightIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveHighlight(highlightIndex)}
                    aria-label={
                      highlight.title.trim().length > 0
                        ? `Remove ${highlight.title.trim()}`
                        : `Remove block ${String(highlightIndex + 1)}`
                    }
                    className="flex cursor-pointer items-center transition-opacity hover:opacity-70"
                  >
                    <Image
                      src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt=""
                      width={20}
                      height={20}
                    />
                  </button>
                </div>

                <input
                  type="text"
                  value={highlight.title}
                  maxLength={PRODUCT_HIGHLIGHT_TITLE_MAX_LENGTH}
                  onChange={(event) =>
                    onHighlightTextChange(highlightIndex, "title", event.target.value)
                  }
                  placeholder="Heading — e.g. Solid oak, not veneer"
                  aria-label={`Block ${String(highlightIndex + 1)} heading`}
                  className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
                />
                <textarea
                  value={highlight.bodyText}
                  maxLength={PRODUCT_HIGHLIGHT_BODY_MAX_LENGTH}
                  onChange={(event) =>
                    onHighlightTextChange(highlightIndex, "bodyText", event.target.value)
                  }
                  rows={3}
                  placeholder="What a buyer should know about this point."
                  aria-label={`Block ${String(highlightIndex + 1)} text`}
                  className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
                />

                <div className="flex items-center gap-3">
                  {(highlight.imageFile !== null || highlight.imageUrl !== null) && (
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border">
                      <HighlightImagePreview
                        imageFile={highlight.imageFile}
                        imageUrl={highlight.imageUrl}
                        className="size-full object-cover"
                      />
                    </div>
                  )}
                  <label className="cursor-pointer text-xs font-medium text-primary-imprint underline-offset-2 hover:underline">
                    {highlight.imageFile === null && highlight.imageUrl === null
                      ? "Add an image"
                      : "Replace image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        onHighlightImageChange(highlightIndex, event.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {highlight.imageFile !== null && (
                    <span className="text-xs text-muted-foreground">Uploads when you save.</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          {highlights.length}/{PRODUCT_HIGHLIGHT_MAX_COUNT} blocks added
        </p>
      </div>
    </StepCard>
  );
}
