"use client";

import Image from "next/image";
import { StepCard } from "../listing-editor-subcomponents";

export function DescriptionStep({
  productDescription,
  onProductDescriptionChange,
  keyFeatureDraft,
  onKeyFeatureDraftChange,
  keyFeatures,
  onAddKeyFeature,
  onRemoveKeyFeature,
}: {
  readonly productDescription: string;
  readonly onProductDescriptionChange: (description: string) => void;
  readonly keyFeatureDraft: string;
  readonly onKeyFeatureDraftChange: (draft: string) => void;
  readonly keyFeatures: readonly string[];
  readonly onAddKeyFeature: () => void;
  readonly onRemoveKeyFeature: (featureIndex: number) => void;
}) {
  return (
    <StepCard
      title="Description"
      subtitle="Describe your product and highlight what makes it worth buying."
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-description" className="text-sm font-medium text-foreground">
          Product description
        </label>
        <textarea
          id="product-description"
          value={productDescription}
          onChange={(event) => onProductDescriptionChange(event.target.value)}
          placeholder="Describe materials, dimensions, use cases, and anything a buyer should know."
          rows={6}
          className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="key-feature" className="text-sm font-medium text-foreground">
          Key features
        </label>
        <div className="flex gap-2">
          <input
            id="key-feature"
            type="text"
            value={keyFeatureDraft}
            onChange={(event) => onKeyFeatureDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddKeyFeature();
              }
            }}
            placeholder="e.g. 30-hour battery life"
            className="h-12 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
          />
          <button
            type="button"
            onClick={onAddKeyFeature}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Image
              src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
            Add
          </button>
        </div>
      </div>

      {keyFeatures.length > 0 && (
        <ul className="flex flex-col gap-2">
          {keyFeatures.map((feature, featureIndex) => (
            <li
              key={`${feature}-${featureIndex}`}
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
            >
              <p className="min-w-0 truncate text-sm text-foreground">{feature}</p>
              <button
                type="button"
                onClick={() => onRemoveKeyFeature(featureIndex)}
                aria-label={`Remove feature: ${feature}`}
                className="cursor-pointer transition-opacity hover:opacity-70"
              >
                <Image
                  src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={20}
                  height={20}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </StepCard>
  );
}
