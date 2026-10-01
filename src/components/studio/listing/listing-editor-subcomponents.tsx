"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import PathwayCandidatePicker from "@/components/studio/pathways/pathway-candidate-picker";
import { useSourcingQuoteLinesQuery } from "@/hooks/store/sourcing";
import { formatByteSizeLabel, formatCentsLabel } from "@/lib/store/format";
import {
  PRODUCT_RELATION_KINDS,
  PRODUCT_RELATION_KIND_LABELS,
} from "@/lib/store/merchandising.schemas";
import type { SellerProductRelation, ListingCompleteness } from "@/lib/products/schemas";
import type { SourcingQuoteLine } from "@/lib/store/sourcing.schemas";
import {
  LISTING_REQUIREMENT_LABELS,
  type ProductPublishRefusal,
} from "@/lib/products/publish-refusal";
import {
  PACKAGING_FIELDS,
  stepIndexOf,
  type ListingModelDraft,
  type ListingStepId,
  type PackagingFieldKey,
  type PricingTierDraft,
  type RelationDraft,
} from "./listing-editor-types";

export function FileThumbnailImage({
  file,
  alt,
  className,
}: {
  readonly file: File;
  readonly alt: string;
  readonly className: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    queueMicrotask(() => {
      setPreviewUrl(objectUrl);
    });
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!previewUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={previewUrl} alt={alt} className={className} />;
}

export function HighlightImagePreview({
  imageFile,
  imageUrl,
  className,
}: {
  readonly imageFile: File | null;
  readonly imageUrl: string | null;
  readonly className: string;
}) {
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    queueMicrotask(() => {
      setFilePreviewUrl(objectUrl);
    });
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const displayUrl = filePreviewUrl ?? imageUrl;
  if (!displayUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={displayUrl} alt="" className={className} />;
}

export function RelationRows({
  relations,
  readOnlyRelations,
  onRelationsChange,
}: {
  readonly relations: readonly RelationDraft[];
  readonly readOnlyRelations: readonly SellerProductRelation[];
  readonly onRelationsChange: (relations: RelationDraft[]) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div className="space-y-3">
      {relations.length === 0 && readOnlyRelations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing linked yet. Until something is, the “View similar” button stays hidden on your
          listing — two buttons that open empty sheets would be worse than none.
        </p>
      )}

      <ul className="space-y-2">
        {relations.map((relation, relationIndex) => (
          <li
            key={relation.localKey}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2"
          >
            <span className="flex-1 text-sm">{relation.toProductTitle}</span>
            <select
              aria-label={`Relation kind for ${relation.toProductTitle}`}
              value={relation.relationKind}
              onChange={(changeEvent) => {
                const chosen = PRODUCT_RELATION_KINDS.find(
                  (kind) => kind === changeEvent.target.value,
                );
                if (chosen === undefined) return;
                onRelationsChange(
                  relations.map((other, otherIndex) =>
                    otherIndex === relationIndex ? { ...other, relationKind: chosen } : other,
                  ),
                );
              }}
              className="rounded-lg border border-border px-2 py-1.5 text-xs"
            >
              {PRODUCT_RELATION_KINDS.map((relationKind) => (
                <option key={relationKind} value={relationKind}>
                  {PRODUCT_RELATION_KIND_LABELS[relationKind]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                onRelationsChange(relations.filter((_, index) => index !== relationIndex))
              }
              className="cursor-pointer text-xs text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {readOnlyRelations.length > 0 && (
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium">Confirmed by a moderator, or found automatically</p>
          <ul className="mt-1 space-y-0.5">
            {readOnlyRelations.map((relation) => (
              <li key={relation.id} className="text-xs text-muted-foreground">
                {relation.toProductTitle} · {PRODUCT_RELATION_KIND_LABELS[relation.relationKind]}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">These stay whatever you do here.</p>
        </div>
      )}

      {isPickerOpen ? (
        <PathwayCandidatePicker
          onClose={() => setIsPickerOpen(false)}
          onCandidatePicked={(candidate) => {
            const isAlreadyLinked =
              relations.some((other) => other.toProductId === candidate.productId) ||
              readOnlyRelations.some((other) => other.toProductId === candidate.productId);
            if (!isAlreadyLinked) {
              onRelationsChange([
                ...relations,
                {
                  localKey: crypto.randomUUID(),
                  toProductId: candidate.productId,
                  toProductTitle: candidate.productTitle,
                  relationKind: "complements",
                },
              ]);
            }
            setIsPickerOpen(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium outline -outline-offset-1 outline-border"
        >
          Link a product
        </button>
      )}
    </div>
  );
}

export function PublishRefusalNotice({ refusal }: { readonly refusal: ProductPublishRefusal }) {
  const containerClassName =
    "mt-4 space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive";

  switch (refusal.kind) {
    case "incomplete":
      return (
        <p role="alert" className={containerClassName}>
          {refusal.message}
        </p>
      );
    case "invalid":
      return (
        <div role="alert" className={containerClassName}>
          <p>{refusal.message}</p>
          <ul className="space-y-0.5 text-xs">
            {refusal.fieldMessages.map((fieldMessage) => (
              <li key={fieldMessage.field}>
                {fieldMessage.field !== "form" && (
                  <span className="font-medium">{fieldMessage.field}: </span>
                )}
                {fieldMessage.messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      );
    case "failed":
      return (
        <p role="alert" className={containerClassName}>
          {refusal.message}
        </p>
      );
    default: {
      const exhaustiveCheck: never = refusal;
      return exhaustiveCheck;
    }
  }
}

export function ListingCompletenessChecklist({
  completeness,
  onEditClick,
}: {
  readonly completeness: ListingCompleteness;
  readonly onEditClick: (stepIndex: number) => void;
}) {
  const stepIdByRequirementKey: Record<string, ListingStepId> = {
    title: "identity",
    images: "images",
    price: "pricing",
    samplePrice: "pricing",
    shippingFacts: "pricing",
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Ready to publish</h3>
        <span className="text-xs text-muted-foreground">
          {completeness.satisfiedRequirementCount} of {completeness.applicableRequirementCount} done
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {completeness.requirements.map((requirement) => {
          if (requirement.state === "not_applicable") return null;
          const isSatisfied = requirement.state === "satisfied";
          return (
            <li key={requirement.key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`flex size-4 shrink-0 items-center justify-center rounded-full text-xs ${
                  isSatisfied ? "bg-primary text-background" : "border border-destructive/60"
                }`}
              >
                {isSatisfied ? "✓" : ""}
              </span>
              <span className={isSatisfied ? "text-muted-foreground" : "text-foreground"}>
                {LISTING_REQUIREMENT_LABELS[requirement.key]}
              </span>
              {!isSatisfied && (
                <button
                  type="button"
                  onClick={() =>
                    onEditClick(stepIndexOf(stepIdByRequirementKey[requirement.key] ?? "identity"))
                  }
                  className="cursor-pointer text-xs text-primary-imprint underline-offset-2 hover:underline"
                >
                  Add
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PackagingInput({
  fieldKey,
  value,
  onValueChange,
}: {
  readonly fieldKey: PackagingFieldKey;
  readonly value: string;
  readonly onValueChange: (nextValue: string) => void;
}) {
  const field =
    PACKAGING_FIELDS.find((candidate) => candidate.key === fieldKey) ?? PACKAGING_FIELDS[0];
  const inputId = `listing-${field.key}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        {field.label}
        {field.unit !== "" && <span className="text-muted-foreground"> ({field.unit})</span>}
      </label>
      <input
        id={inputId}
        type="number"
        min="1"
        step="1"
        max={field.max}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={field.key === "unitsPerPackage" ? "e.g. 24" : "0"}
        className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
      />
    </div>
  );
}

export function PricingTierRows({
  tiers,
  onTierChange,
  onRemoveTier,
}: {
  readonly tiers: readonly PricingTierDraft[];
  readonly onTierChange: (
    tierIndex: number,
    field: "unitPriceInDollars" | "minimumOrderQuantity" | "leadTimeDays",
    value: string,
  ) => void;
  readonly onRemoveTier: (tierIndex: number) => void;
}) {
  const tierFieldIdPrefix = useId();
  if (tiers.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {tiers.map((tier, tierIndex) => (
        <li
          key={tier.id}
          className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3 rounded-xl border border-border p-3"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${tierFieldIdPrefix}-${tier.id}-unit-price`}
              className="text-xs font-medium text-muted-foreground"
            >
              Unit price
            </label>
            <div className="flex h-11 items-center rounded-lg border border-border px-3 focus-within:border-primary-imprint">
              <span className="mr-2 text-sm text-muted-foreground">$</span>
              <input
                id={`${tierFieldIdPrefix}-${tier.id}-unit-price`}
                type="number"
                min="0"
                step="0.01"
                value={tier.unitPriceInDollars}
                onChange={(event) =>
                  onTierChange(tierIndex, "unitPriceInDollars", event.target.value)
                }
                placeholder="0.00"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${tierFieldIdPrefix}-${tier.id}-minimum-quantity`}
              className="text-xs font-medium text-muted-foreground"
            >
              Min. quantity
            </label>
            <input
              id={`${tierFieldIdPrefix}-${tier.id}-minimum-quantity`}
              type="number"
              min="1"
              value={tier.minimumOrderQuantity}
              onChange={(event) =>
                onTierChange(tierIndex, "minimumOrderQuantity", event.target.value)
              }
              placeholder="e.g. 10"
              className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${tierFieldIdPrefix}-${tier.id}-lead-time`}
              className="text-xs font-medium text-muted-foreground"
            >
              Lead time (days)
            </label>
            <input
              id={`${tierFieldIdPrefix}-${tier.id}-lead-time`}
              type="number"
              min="0"
              max="3650"
              value={tier.leadTimeDays}
              onChange={(event) => onTierChange(tierIndex, "leadTimeDays", event.target.value)}
              placeholder="Listing's"
              className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveTier(tierIndex)}
            aria-label="Remove tier"
            className="flex h-11 cursor-pointer items-center transition-opacity hover:opacity-70"
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
  );
}

export function SourcingQuoteLinePicker({
  selectedId,
  onSelect,
}: {
  readonly selectedId: string | null;
  readonly onSelect: (next: string | null) => void;
}) {
  const sourcingQuery = useSourcingQuoteLinesQuery();
  const result = sourcingQuery.data;

  const lines: readonly SourcingQuoteLine[] =
    result !== undefined && result.success ? result.data.items : [];
  const selectedLine = lines.find((line) => line.quoteProductLineId === selectedId) ?? null;
  const sourcingQuoteSelectId = useId();

  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-6">
      <label htmlFor={sourcingQuoteSelectId} className="text-sm font-medium text-foreground">
        What these goods cost you
      </label>
      <p className="text-xs text-muted-foreground">
        Optional. Link the accepted quote you sourced these goods under, and Studio can show what
        they cost beside what they earned. Nothing is published to buyers.
      </p>

      {sourcingQuery.isPending ? (
        <p className="mt-1 text-xs text-muted-foreground">Loading your accepted quotes…</p>
      ) : result !== undefined && !result.success ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {result.error.code}: {result.error.message}
        </p>
      ) : lines.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          You have no accepted quotes to link yet. Quotes you accept on a{" "}
          <Link href="/store/rfqs" className="underline">
            request for quotation
          </Link>{" "}
          appear here.
        </p>
      ) : (
        <>
          <select
            id={sourcingQuoteSelectId}
            value={selectedId ?? ""}
            onChange={(event) => onSelect(event.target.value === "" ? null : event.target.value)}
            className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Not sourced through a Qatoto quote</option>
            {lines.map((line) => (
              <option key={line.quoteProductLineId} value={line.quoteProductLineId}>
                {line.titleSnapshot} · {line.providerDisplayName} ·{" "}
                {formatCentsLabel(line.unitPriceInCents, line.currency)} per unit
              </option>
            ))}
          </select>
          {selectedLine !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCentsLabel(selectedLine.unitPriceInCents, selectedLine.currency)} per unit,
              from revision {selectedLine.revisionNumber} of a quote on &ldquo;
              {selectedLine.rfqTitle}
              &rdquo;. Shown in the quote&apos;s own currency, never converted.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function StepCard({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border p-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export function ReviewSection({
  title,
  onEditClick,
  rows,
}: {
  readonly title: string;
  readonly onEditClick: () => void;
  readonly rows: readonly { readonly label: string; readonly value: string }[];
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEditClick}
          className="cursor-pointer text-sm text-primary-imprint hover:underline"
        >
          Edit
        </button>
      </div>
      <dl className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[10rem_1fr] gap-2">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 text-sm wrap-break-word text-foreground">
              {row.value.trim() ? (
                row.value
              ) : (
                <span className="text-muted-foreground italic">Not provided</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ListingModelSlot({
  listingModelDraft,
  onSelectModelClick,
  onRemoveModelClick,
  onUndoRemoveModelClick,
}: {
  readonly listingModelDraft: ListingModelDraft;
  readonly onSelectModelClick: () => void;
  readonly onRemoveModelClick: () => void;
  readonly onUndoRemoveModelClick: () => void;
}) {
  switch (listingModelDraft.kind) {
    case "none":
      return (
        <button
          type="button"
          onClick={onSelectModelClick}
          className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50"
        >
          Select .glb file
        </button>
      );
    case "existing":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <span className="min-w-0 text-sm">
            <span className="block truncate font-medium">{listingModelDraft.model.fileName}</span>
            <span className="text-xs text-muted-foreground">
              {formatByteSizeLabel(listingModelDraft.model.byteSize)} · saved
            </span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSelectModelClick}
              className="cursor-pointer text-xs text-primary underline"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemoveModelClick}
              className="cursor-pointer text-xs text-destructive underline"
            >
              Remove
            </button>
          </div>
        </div>
      );
    case "pending":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2">
          <span className="min-w-0 text-sm">
            <span className="block truncate font-medium">{listingModelDraft.modelFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatByteSizeLabel(listingModelDraft.modelFile.size)} · uploads when you save
            </span>
          </span>
          <button
            type="button"
            onClick={onRemoveModelClick}
            className="cursor-pointer text-xs text-destructive underline"
          >
            Remove
          </button>
        </div>
      );
    case "removing":
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 opacity-70">
          <span className="min-w-0 text-sm">
            <span className="block truncate font-medium line-through">
              {listingModelDraft.model.fileName}
            </span>
            <span className="text-xs text-muted-foreground">Removed when you save</span>
          </span>
          <button
            type="button"
            onClick={onUndoRemoveModelClick}
            className="cursor-pointer text-xs text-primary underline"
          >
            Undo
          </button>
        </div>
      );
    default: {
      const exhaustiveCheck: never = listingModelDraft;
      return exhaustiveCheck;
    }
  }
}

export function StepSectionHeader({
  title,
  description,
  buttonLabel,
  onButtonClick,
  isButtonDisabled = false,
}: {
  readonly title: string;
  readonly description: string;
  readonly buttonLabel: string;
  readonly onButtonClick: () => void;
  readonly isButtonDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onButtonClick}
        disabled={isButtonDisabled}
        className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Image
          src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={18}
          height={18}
        />
        {buttonLabel}
      </button>
    </div>
  );
}
