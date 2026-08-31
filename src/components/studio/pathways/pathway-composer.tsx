"use client";

// TRANSPORT: client-query — creates a set, then edits it in independently-saved sections.
//
// ONE COMPONENT FOR CREATE AND EDIT, switched by an optional `pathwayId`, following
// `CreateListingPage` and `PitchComposer`. ⚠️ The route uses `?pathwayId=` and NOT a `[pathwayId]`
// segment: a dynamic segment needs `generateStaticParams` under `cacheComponents`, and there is
// nothing to prerender for a route that only ever serves one person's private draft.
//
// SECTIONS SAVE INDEPENDENTLY, the shape `factory-profile-editor.tsx` established — each owns its
// state, its mutation, its idempotency key and its own notice — with ONE exception that is not
// negotiable:
//
// ⚠️ **THE PLAN IS ONE SAVE, NOT ONE SAVE PER SLOT.** `PUT …/slots` cascade-deletes every candidate
// under the pathway, so a per-slot button would destroy the other slots' products. See
// `pathway-authoring.api.ts`.

import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import StatusPanel from "@/components/home/shared/status-panel";
import PathwayAccentPicker from "@/components/studio/pathways/pathway-accent-picker";
import PathwaySlotEditor, {
  type SlotDraft,
} from "@/components/studio/pathways/pathway-slot-editor";
import {
  usePathwaysMineQuery,
  useCreatePathwayMutation,
  useReplacePathwayImageMutation,
  useSavePathwayPlanMutation,
  useSubmitPathwayMutation,
  useUpdatePathwayMutation,
} from "@/hooks/store/pathway-authoring";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { newIdempotencyKey } from "@/lib/idempotency";
import {
  isEditablePathwayState,
  PATHWAY_ACCENTS,
  PATHWAY_STATE_LABELS,
  type PathwayAccent,
  type PathwayAuthoring,
} from "@/lib/store/pathway-authoring.schemas";

const SECTION_CLASS = "rounded-2xl border border-border p-4";
const FIELD_CLASS = "mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium outline -outline-offset-1 outline-border disabled:opacity-40";

/** Narrows a `<select>`/swatch value without an `as` cast — the house style. */
function narrowToAccent(value: string): PathwayAccent {
  return PATHWAY_ACCENTS.find((accent) => accent === value) ?? "slate";
}

export default function PathwayComposer({ pathwayId }: { readonly pathwayId?: string }) {
  const pathwaysQuery = usePathwaysMineQuery();

  if (pathwayId === undefined) return <CreatePathwayForm />;

  if (pathwaysQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading this set…</p>;
  }
  if (pathwaysQuery.data === undefined || pathwaysQuery.isError) {
    return <StatusPanel message="Couldn't load this set. Please try again." />;
  }
  if (!pathwaysQuery.data.success) {
    return <StatusPanel message={pathwaysQuery.data.error.message} />;
  }

  const pathway = pathwaysQuery.data.data.items.find((item) => item.id === pathwayId);
  if (pathway === undefined) {
    return (
      <StatusPanel message="That set isn't one of yours. It may belong to another organization, or the link may be out of date." />
    );
  }

  return <PathwayEditor pathway={pathway} />;
}

/**
 * Creating is its own small form because a set has to EXIST before anything else can attach to it —
 * images need a saved id, and so do slots. The same sequencing `StakeholdersForm` states for
 * portraits.
 */
function CreatePathwayForm() {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const createPathway = useCreatePathwayMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const [createdPathway, setCreatedPathway] = useState<PathwayAuthoring | null>(null);

  if (createdPathway !== null) return <PathwayEditor pathway={createdPathway} />;

  const handleCreateClick = () => {
    if (createPathway.isPending) return;
    createPathway.mutate(
      {
        input: { slug: slug.trim(), title: title.trim() },
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          resetIdempotencyKey();
          setCreatedPathway(result.data);
        },
      },
    );
  };

  return (
    <section className={SECTION_CLASS}>
      <h2 className="text-lg font-semibold">Start a set</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A set is a shopping list somebody else can follow — &ldquo;everything for a hotel
        refit&rdquo; — with a piece for each thing they need and the products that can fill it.
      </p>

      <label className="mt-3 block text-xs text-muted-foreground">
        Name
        <input
          type="text"
          value={title}
          maxLength={120}
          onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <label className="mt-2 block text-xs text-muted-foreground">
        Web address
        <input
          type="text"
          value={slug}
          maxLength={100}
          onChange={(changeEvent) => setSlug(changeEvent.target.value)}
          placeholder="hotel-refit-essentials"
          className={FIELD_CLASS}
        />
        {/* ⚠️ Said before the press, not after: `slug` is absent from the update body and
            `.strict()` refuses it, so this is genuinely the only chance to choose. */}
        <span className="mt-1 block text-[11px]">
          Lower case and hyphens. <strong>This cannot be changed later</strong> — it becomes the
          set&rsquo;s public address.
        </span>
      </label>

      <button
        type="button"
        onClick={handleCreateClick}
        disabled={createPathway.isPending || slug.trim() === "" || title.trim() === ""}
        className={`${PRIMARY_BUTTON_CLASS} mt-3`}
      >
        {createPathway.isPending ? "Creating…" : "Create the set"}
      </button>

      <MutationNotice
        result={createPathway.data}
        fallbackMessage="That set could not be created."
        hasThrown={createPathway.isError}
      />
    </section>
  );
}

function PathwayEditor({ pathway }: { readonly pathway: PathwayAuthoring }) {
  const isEditable = isEditablePathwayState(pathway.state);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{pathway.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PATHWAY_STATE_LABELS[pathway.state]} · /store/pathways/{pathway.slug}
        </p>
        {!isEditable && (
          <p className="mt-2 rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
            {pathway.state === "pending_review"
              ? "A moderator has this. You cannot change it while it is being read."
              : /* ⚠️ The honest sentence about a one-way door. There is no unpublish route. */
                "This set is published. Published sets cannot be edited or taken down from here."}
          </p>
        )}
        {pathway.reviewNote !== null && (
          <p className="mt-2 rounded-2xl bg-muted/40 p-3 text-sm">
            What the reviewer said: {pathway.reviewNote}
          </p>
        )}
      </header>

      <MetadataSection pathway={pathway} isEditable={isEditable} />
      <ImageSection pathway={pathway} isEditable={isEditable} />
      <PlanSection pathway={pathway} isEditable={isEditable} />
      <SubmitSection pathway={pathway} isEditable={isEditable} />
    </div>
  );
}

function MetadataSection({
  pathway,
  isEditable,
}: {
  readonly pathway: PathwayAuthoring;
  readonly isEditable: boolean;
}) {
  const [title, setTitle] = useState(pathway.title);
  const [summary, setSummary] = useState(pathway.summary ?? "");
  const [accent, setAccent] = useState<PathwayAccent>(() => narrowToAccent(pathway.accent));
  const [endsAt, setEndsAt] = useState(pathway.endsAt?.slice(0, 10) ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const updatePathway = useUpdatePathwayMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const handleSaveClick = () => {
    if (updatePathway.isPending) return;
    // A sparse patch: only what changed. The body refines to "at least one field", so an empty
    // one is a 422 — refused here instead, the way `OfferingEditForm` does.
    const patch = {
      ...(title.trim() === pathway.title ? {} : { title: title.trim() }),
      ...(summary.trim() === (pathway.summary ?? "")
        ? {}
        : { summary: summary.trim() === "" ? null : summary.trim() }),
      ...(accent === pathway.accent ? {} : { accent }),
      ...(endsAt === (pathway.endsAt?.slice(0, 10) ?? "")
        ? {}
        : { endsAt: endsAt === "" ? null : new Date(endsAt).toISOString() }),
    };
    if (Object.keys(patch).length === 0) {
      setLocalError("Nothing has changed yet.");
      return;
    }
    setLocalError(null);
    updatePathway.mutate(
      { pathwayId: pathway.id, patch, idempotencyKey: getIdempotencyKey() },
      {
        onSuccess: (result) => {
          if (result.success) resetIdempotencyKey();
        },
      },
    );
  };

  return (
    <section className={SECTION_CLASS}>
      <h2 className="text-sm font-medium">About the set</h2>

      <label className="mt-2 block text-xs text-muted-foreground">
        Name
        <input
          type="text"
          value={title}
          maxLength={120}
          disabled={!isEditable}
          onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <label className="mt-2 block text-xs text-muted-foreground">
        What it is for
        <textarea
          value={summary}
          maxLength={500}
          rows={2}
          disabled={!isEditable}
          onChange={(changeEvent) => setSummary(changeEvent.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <PathwayAccentPicker
        selectedAccent={accent}
        onAccentSelect={setAccent}
        isDisabled={!isEditable}
      />

      <label className="mt-2 block text-xs text-muted-foreground">
        Stop showing it after
        <input
          type="date"
          value={endsAt}
          disabled={!isEditable}
          onChange={(changeEvent) => setEndsAt(changeEvent.target.value)}
          className={FIELD_CLASS}
        />
        {/* ⚠️ The one lever that can ever remove a PUBLISHED set from the storefront, and it can
            only be set while the set is still editable — i.e. before it is submitted. */}
        <span className="mt-1 block text-[11px]">
          Optional, and worth setting now: once a set is published it cannot be taken down, and this
          date is the only thing that will retire it.
        </span>
      </label>

      {isEditable && (
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={updatePathway.isPending}
          className={`${QUIET_BUTTON_CLASS} mt-3`}
        >
          {updatePathway.isPending ? "Saving…" : "Save details"}
        </button>
      )}

      {localError !== null && (
        <output role="alert" className="mt-2 block text-xs text-red-700">
          {localError}
        </output>
      )}
      <MutationNotice
        result={updatePathway.data}
        fallbackMessage="Those details could not be saved."
        hasThrown={updatePathway.isError}
      />
    </section>
  );
}

function ImageSection({
  pathway,
  isEditable,
}: {
  readonly pathway: PathwayAuthoring;
  readonly isEditable: boolean;
}) {
  const replaceImage = useReplacePathwayImageMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const handleFileChange = (imageSlot: "hero" | "card", fileList: FileList | null) => {
    const imageFile = fileList?.[0];
    if (imageFile === undefined || replaceImage.isPending) return;
    replaceImage.mutate(
      { pathwayId: pathway.id, imageSlot, imageFile, idempotencyKey: getIdempotencyKey() },
      {
        onSuccess: (result) => {
          if (result.success) resetIdempotencyKey();
        },
      },
    );
  };

  return (
    <section className={SECTION_CLASS}>
      <h2 className="text-sm font-medium">Pictures</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        A wide one for the top of the page, and a square-ish one for the card. Without them the card
        falls back to the tint above.
      </p>

      {(["hero", "card"] as const).map((imageSlot) => (
        <label key={imageSlot} className="mt-2 block text-xs text-muted-foreground capitalize">
          {imageSlot}
          <input
            type="file"
            accept="image/*"
            disabled={!isEditable || replaceImage.isPending}
            onChange={(changeEvent) => handleFileChange(imageSlot, changeEvent.target.files)}
            className="mt-1 block w-full text-xs"
          />
        </label>
      ))}

      <MutationNotice
        result={replaceImage.data}
        fallbackMessage="That picture could not be saved."
        hasThrown={replaceImage.isError}
      />
    </section>
  );
}

function PlanSection({
  pathway,
  isEditable,
}: {
  readonly pathway: PathwayAuthoring;
  readonly isEditable: boolean;
}) {
  const [slots, setSlots] = useState<readonly SlotDraft[]>(() =>
    pathway.slots.map((slot) => ({
      localKey: slot.id,
      roleLabel: slot.roleLabel,
      isRequired: slot.isRequired,
      quantity: slot.quantity,
      derivedRelationKind: slot.derivedRelationKind,
      candidates: slot.candidates.map((candidate) => ({
        productId: candidate.productId,
        // The names come from the backend join added for this surface. Without it these would be
        // uuids and the editor would be unusable on reload.
        productTitle: candidate.productTitle ?? "A listing that is no longer available",
        productPublicSlug: candidate.productPublicSlug ?? "",
        variantId: candidate.variantId,
        variantName: candidate.variantName,
        minimumOrderQuantity: candidate.minimumOrderQuantity,
      })),
    })),
  );
  const [savedSlotCount, setSavedSlotCount] = useState<number | null>(null);

  const savePlan = useSavePathwayPlanMutation();

  const handleSavePlanClick = () => {
    if (savePlan.isPending) return;
    setSavedSlotCount(null);
    savePlan.mutate(
      {
        pathwayId: pathway.id,
        slots: slots.map((slot) => ({
          slot: {
            roleLabel: slot.roleLabel.trim(),
            isRequired: slot.isRequired,
            quantity: slot.quantity,
            ...(slot.derivedRelationKind === null
              ? {}
              : { derivedRelationKind: slot.derivedRelationKind }),
          },
          candidates: slot.candidates.map((candidate, candidateIndex) => ({
            productId: candidate.productId,
            // OMITTED when absent, never null: a product with no variants that names one is
            // `VARIANT_NOT_APPLICABLE`, and the body is `.strict()`.
            ...(candidate.variantId === null ? {} : { variantId: candidate.variantId }),
            rank: candidateIndex,
          })),
        })),
        // A FRESH KEY PER REQUEST. The save is `1 + slotCount` separate writes, and one key reused
        // across them would make every candidate write a replay of the slot write.
        makeIdempotencyKey: () => newIdempotencyKey(),
        onProgress: (progress) => {
          if (progress.phase === "candidates" && progress.slotIndex !== undefined) {
            setSavedSlotCount(progress.slotIndex);
          }
        },
      },
      { onSuccess: (result) => setSavedSlotCount(result.success ? slots.length : savedSlotCount) },
    );
  };

  return (
    <section className={SECTION_CLASS}>
      <h2 className="text-sm font-medium">What is in the set</h2>

      <div className="mt-2">
        <PathwaySlotEditor
          slots={slots}
          onSlotsChange={setSlots}
          isAnchored={pathway.anchorProductId !== null}
          isDisabled={!isEditable}
        />
      </div>

      {isEditable && (
        <>
          <button
            type="button"
            onClick={handleSavePlanClick}
            disabled={savePlan.isPending}
            className={`${PRIMARY_BUTTON_CLASS} mt-3`}
          >
            {savePlan.isPending ? "Saving the whole set…" : "Save the set"}
          </button>
          {/*
            ⚠️ ONE BUTTON FOR THE WHOLE PLAN, AND THE COPY SAYS SO. Saving pieces one at a time is
            not possible: the server rewrites the entire plan on every save, so the products on
            every piece are re-sent together or they are lost.
          */}
          <p className="mt-2 text-[11px] text-muted-foreground">
            The whole set saves together — pieces and products in one go.
          </p>
        </>
      )}

      {savePlan.isPending && savedSlotCount !== null && (
        <p className="mt-2 text-xs text-muted-foreground">
          Saved {savedSlotCount} of {slots.length} pieces…
        </p>
      )}
      {savePlan.data?.success === false && savedSlotCount !== null && (
        <p className="mt-2 text-xs text-red-700">
          {/* A partial save is stated rather than hidden: there is no transaction across these
              writes, so stopping halfway is a real outcome the author has to be able to see. */}
          It stopped after {savedSlotCount} of {slots.length} pieces. Press save again to finish —
          the pieces already saved will simply be written again.
        </p>
      )}
      <MutationNotice
        result={savePlan.data}
        fallbackMessage="The set could not be saved."
        hasThrown={savePlan.isError}
      />
    </section>
  );
}

function SubmitSection({
  pathway,
  isEditable,
}: {
  readonly pathway: PathwayAuthoring;
  readonly isEditable: boolean;
}) {
  const submitPathway = useSubmitPathwayMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  // Offered on `draft` and `rejected` only. `pending_review` is already queued and `active` is
  // refused by the route — "a control whose only outcome is an error is worse than its absence."
  if (!isEditable) return null;

  return (
    <section className={SECTION_CLASS}>
      <h2 className="text-sm font-medium">Send it for review</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        A moderator reads every set before it goes out, because a curated list of one seller&rsquo;s
        own products would be an advertisement wearing a shopping list&rsquo;s clothes.{" "}
        <strong>Once it is published it cannot be edited or taken down</strong>, so set an end date
        above if you want it to stop on its own.
      </p>
      <button
        type="button"
        onClick={() => {
          if (submitPathway.isPending) return;
          submitPathway.mutate(
            { pathwayId: pathway.id, idempotencyKey: getIdempotencyKey() },
            {
              onSuccess: (result) => {
                if (result.success) resetIdempotencyKey();
              },
            },
          );
        }}
        disabled={submitPathway.isPending}
        className={`${PRIMARY_BUTTON_CLASS} mt-3`}
      >
        {submitPathway.isPending ? "Sending…" : "Send for review"}
      </button>
      <MutationNotice
        result={submitPathway.data}
        fallbackMessage="That set could not be sent for review."
        hasThrown={submitPathway.isError}
      />
    </section>
  );
}
