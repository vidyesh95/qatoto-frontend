// TRANSPORT: client-query — the list, create, edit, reorder, activate/deactivate and delete
// all call hooks in `@/hooks/promo`. The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

import Image from "next/image";
import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useAdminPromotionalSlidesQuery,
  useCreatePromotionalSlideMutation,
  useDeletePromotionalSlideMutation,
  useReorderPromotionalSlidesMutation,
  useReplacePromotionalSlideImageMutation,
  useUpdatePromotionalSlideMutation,
} from "@/hooks/promo";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import { ApiRequestError } from "@/lib/http";
import type { AdminPromotionalSlide, PromotionalDestinationKind } from "@/lib/promo/schemas";

/**
 * What the OS file picker may offer, mirroring ALLOWED_INPUT_FORMATS in the backend's
 * `src/lib/image.ts`. Without it the picker offers files the server will refuse, and the
 * admin only finds out after an upload round trip.
 *
 * BOTH MIME TYPES AND EXTENSIONS: some pickers filter on UTI/extension rather than MIME, and
 * macOS Finder in particular greys files out when only MIME types are listed.
 *
 * `image/heic` IS DELIBERATELY ABSENT. The server cannot decode HEVC-coded HEIC — libheif is
 * built with the AV1 decoder only — and on iOS an accept list with no HEIC entry makes Safari
 * hand over a transcoded JPEG instead. Omitting it is the fix, not an oversight.
 */
const ACCEPTED_SLIDE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
].join(",");

/**
 * The list has a `restricted` variant the other admin queues do not need.
 *
 * `/admin/categories` can show its queues to any staff member because those reads are
 * public. This one is not: the admin list exposes retired rows, scheduled campaigns and who
 * authored them, so it is capability-gated and the query is disabled without it. "Nothing to
 * show because you may not look" is a different state from "nothing to show".
 */
type SlideListViewState =
  | { status: "loading" }
  | { status: "restricted" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; slides: AdminPromotionalSlide[] };

function toSlideListViewState(
  canManage: boolean,
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data: AdminPromotionalSlide[] | undefined;
  },
): SlideListViewState {
  if (!canManage) return { status: "restricted" };
  if (query.isPending) return { status: "loading" };
  if (query.isError || query.data === undefined) {
    return {
      status: "error",
      message:
        query.error instanceof ApiRequestError
          ? query.error.apiError.message
          : "Couldn't load the carousel.",
    };
  }
  return query.data.length === 0 ? { status: "empty" } : { status: "ready", slides: query.data };
}

/** "1st", "2nd", "3rd", "4th"… from a 0-based position. */
function toOrdinalLabel(zeroBasedPosition: number): string {
  const displayPosition = zeroBasedPosition + 1;
  const lastTwoDigits = displayPosition % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${String(displayPosition)}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[displayPosition % 10] ?? "th";
  return `${String(displayPosition)}${suffix}`;
}

/**
 * The promotional carousel console.
 *
 * THREE CONTROLS ARE THE POINT — add a slide with a link, set which slide shows 1st / 2nd /
 * 3rd, and delete one. Everything else on a row (activate, edit, replace image) exists
 * because it costs nothing once those three do.
 *
 * `manage_promotions` IS ADMIN-ONLY, deliberately narrower than `moderate_content`. A slide
 * is a front-page placement that may point at an arbitrary external URL — a phishing lure
 * wearing Qatoto's own branding — so its blast radius sits next to role management rather
 * than next to a review queue. Failing the capability degrades this page to read-only; it
 * does not hide it, matching every other console here.
 *
 * NOTHING IS OPTIMISTIC. Every control waits for the server and the list re-renders from its
 * answer, so what an admin sees after a reorder is exactly what the front page will serve.
 */
export default function PromotionalSlideAdminPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canManagePromotionalSlides =
    staffContextQuery.data?.capabilities.includes("manage_promotions") ?? false;

  const slidesQuery = useAdminPromotionalSlidesQuery(canManagePromotionalSlides);

  // THE PAGE OWNS ONLY LIST-LEVEL WRITES. Update and image-replace live inside SlideRow, so
  // their errors render on the row the admin clicked rather than in one banner at the top of
  // the page — see the SlideRow doc comment for why that distinction was load-bearing.
  // Reorder stays here on purpose: it sends the whole permutation, so its failure belongs to
  // the list, not to any single row.
  const createSlide = useCreatePromotionalSlideMutation();
  const reorderSlides = useReorderPromotionalSlidesMutation();
  const deleteSlide = useDeletePromotionalSlideMutation();

  const firstError = [createSlide.error, reorderSlides.error, deleteSlide.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const listState = toSlideListViewState(canManagePromotionalSlides, {
    isPending: slidesQuery.isPending,
    isError: slidesQuery.isError,
    error: slidesQuery.error,
    data: slidesQuery.data,
  });

  const orderedSlideIds = slidesQuery.data?.map((slide) => slide.id) ?? [];

  /**
   * Moves one slide to a new index and sends the WHOLE resulting order.
   *
   * Both the arrows and the "Show as" select come through here, so there is one place the
   * permutation is computed. A per-slide position write would leave a window where two
   * slides claim the same slot with no way to say which the admin meant.
   */
  function handleMoveSlide(slideId: string, targetIndex: number) {
    const currentIndex = orderedSlideIds.indexOf(slideId);
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= orderedSlideIds.length) {
      return;
    }
    const reordered = [...orderedSlideIds];
    reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, slideId);
    reorderSlides.mutate(reordered);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Promotions</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The carousel at the top of the home page. Each slide is an image plus the place it links
          to, and the order here is the order visitors see.
        </p>
      </header>

      {/* Three distinct cases, said apart — a failed permission check is not the same as
          failing it. */}
      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so this page is read-only.
        </output>
      )}
      {staffContextQuery.isSuccess && !canManagePromotionalSlides && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Managing the promotional carousel needs the admin role. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so this page is read-only.
        </output>
      )}

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      {canManagePromotionalSlides && (
        <CreateSlideForm
          isSubmitting={createSlide.isPending}
          onCreate={(input) => {
            createSlide.mutate(input);
          }}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Slides</h2>
        {renderSlideList()}
      </section>
    </div>
  );

  function renderSlideList() {
    switch (listState.status) {
      case "restricted":
        return (
          <p className="text-sm text-muted-foreground">The slide list is only visible to admins.</p>
        );
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading…</p>;
      case "error":
        return (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {listState.message}
          </p>
        );
      case "empty":
        return (
          <p className="text-sm text-muted-foreground">
            No slides yet. The home page shows no carousel until you add one.
          </p>
        );
      case "ready":
        return (
          <ul className="space-y-3">
            {listState.slides.map((slide, index) => (
              <SlideRow
                key={slide.id}
                slide={slide}
                index={index}
                slideCount={listState.slides.length}
                // A second permutation computed against a stale array would scramble the
                // order, so every row's ordering control is disabled while one is in flight.
                isReordering={reorderSlides.isPending}
                isDeleting={deleteSlide.isPending}
                onMove={handleMoveSlide}
                onDelete={() => {
                  deleteSlide.mutate(slide.id);
                }}
              />
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = listState;
        return exhaustiveCheck;
      }
    }
  }
}

/**
 * Add a slide: the image and the link, together, in one submit.
 *
 * The destination kind is a RADIO PAIR rather than a select — there are two options and the
 * label copy differs materially between them, which is exactly when radios beat a dropdown.
 */
function CreateSlideForm({
  isSubmitting,
  onCreate,
}: {
  isSubmitting: boolean;
  onCreate: (input: {
    imageFile: File;
    altText: string;
    destinationKind: PromotionalDestinationKind;
    destinationValue: string;
    isActive: boolean;
  }) => void;
}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [destinationKind, setDestinationKind] =
    useState<PromotionalDestinationKind>("internal_path");
  const [destinationValue, setDestinationValue] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isInternal = destinationKind === "internal_path";

  return (
    <section className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <h2 className="text-lg font-medium">Add a slide</h2>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!imageFile) return;
          onCreate({ imageFile, altText, destinationKind, destinationValue, isActive });
          setImageFile(null);
          setAltText("");
          setDestinationValue("");
          event.currentTarget.reset();
        }}
      >
        <div className="space-y-1">
          <label htmlFor="promotional-slide-image" className="block text-sm font-medium">
            Image
          </label>
          <input
            id="promotional-slide-image"
            type="file"
            accept={ACCEPTED_SLIDE_IMAGE_TYPES}
            required
            className="block w-full text-sm"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP or AVIF, up to 5 MB. Re-encoded server-side. iPhone photos saved as HEIC
            aren&apos;t supported — set Settings → Camera → Formats → Most Compatible, or export as
            JPEG.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="promotional-slide-alt" className="block text-sm font-medium">
            Description
          </label>
          <input
            id="promotional-slide-alt"
            type="text"
            required
            maxLength={200}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Winter sale on the store"
            className="w-full rounded-xl border border-[#CAC4D0]/60 bg-background p-2 text-sm"
          />
          {/* Not decoration: the image sits inside a link, so this text IS the link's
              accessible name for anyone not seeing the picture. */}
          <p className="text-xs text-muted-foreground">
            Read aloud in place of the image, and used as the link&apos;s name.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Where it links to</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="promotional-slide-destination-kind"
              checked={isInternal}
              onChange={() => setDestinationKind("internal_path")}
            />
            A page on Qatoto
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="promotional-slide-destination-kind"
              checked={!isInternal}
              onChange={() => setDestinationKind("external_url")}
            />
            An external website
          </label>
          <input
            type="text"
            required
            value={destinationValue}
            onChange={(event) => setDestinationValue(event.target.value)}
            placeholder={isInternal ? "/store/product/abc" : "https://advertiser.example/campaign"}
            inputMode={isInternal ? "text" : "url"}
            aria-label="Destination"
            className="w-full rounded-xl border border-[#CAC4D0]/60 bg-background p-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {isInternal
              ? "Starts with a single slash. Opens in the same tab."
              : "Must start with https://. Opens in a new tab."}
          </p>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Show on the home page straight away
        </label>

        <button
          type="submit"
          disabled={isSubmitting || !imageFile}
          className="cursor-pointer rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding…" : "Add slide"}
        </button>
      </form>
    </section>
  );
}

/** One slide: what it is, where it goes, where it sits, and how to remove it. */
function SlideRow({
  slide,
  index,
  slideCount,
  isReordering,
  isDeleting,
  onMove,
  onDelete,
}: {
  slide: AdminPromotionalSlide;
  index: number;
  slideCount: number;
  isReordering: boolean;
  isDeleting: boolean;
  onMove: (slideId: string, targetIndex: number) => void;
  onDelete: () => void;
}) {
  /**
   * THE ROW OWNS ITS OWN WRITES, and this is the fix for the bug that made a failed image
   * replace read as a caching problem.
   *
   * When these two mutations lived on the page, a 422 from row three rendered in a single
   * banner beside the page heading — often scrolled off the top — while the row itself sat
   * there unchanged. Worse, one shared `isMutating` disabled the controls on EVERY row. The
   * observable result was "I clicked Replace image and nothing happened", which is exactly
   * what got reported, and it survived five retries before anyone read the server log.
   *
   * Owning the hooks here makes error and pending state row-scoped for free — no correlating
   * `variables?.slideId` against the row, and no cross-row disabling.
   */
  const updateSlide = useUpdatePromotionalSlideMutation();
  const replaceImage = useReplacePromotionalSlideImageMutation();

  const isMutating = updateSlide.isPending || replaceImage.isPending;
  const rowError = [replaceImage.error, updateSlide.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  function handleUpdate(patch: {
    altText?: string;
    destinationKind?: PromotionalDestinationKind;
    destinationValue?: string;
    isActive?: boolean;
  }) {
    updateSlide.mutate({ slideId: slide.id, patch });
  }
  const [isEditing, setIsEditing] = useState(false);
  const [draftAltText, setDraftAltText] = useState(slide.altText);
  const [draftDestinationKind, setDraftDestinationKind] = useState<PromotionalDestinationKind>(
    slide.destinationKind,
  );
  const [draftDestinationValue, setDraftDestinationValue] = useState(slide.destinationValue);
  // Two-step inline confirm. `window.confirm` is not available — oxlint sets no-alert: error.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <li className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="flex flex-wrap items-start gap-4">
        <Image
          src={slide.imageUrl}
          width={160}
          height={90}
          alt=""
          className={`h-auto w-40 rounded-lg object-cover transition-opacity ${
            replaceImage.isPending ? "opacity-40" : ""
          }`}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {toOrdinalLabel(slide.position)}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {slide.destinationKind === "internal_path" ? "On Qatoto" : "External"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                slide.isActive ? "bg-green-100 text-green-900" : "bg-muted text-muted-foreground"
              }`}
            >
              {slide.isActive ? "Live" : "Hidden"}
            </span>
          </div>
          <p className="truncate text-sm font-medium">{slide.altText}</p>
          <p className="truncate text-xs text-muted-foreground">{slide.destinationValue}</p>
        </div>

        {/* Ordering. Arrows nudge one step; the select jumps straight to a position, so
            moving the 6th slide to 1st is one action rather than five clicks. */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={isReordering || index === 0}
            onClick={() => onMove(slide.id, index - 1)}
            aria-label="Move up one place"
            className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={isReordering || index === slideCount - 1}
            onClick={() => onMove(slide.id, index + 1)}
            aria-label="Move down one place"
            className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            ▼
          </button>
          <label className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
            Show as
            <select
              value={index}
              disabled={isReordering}
              onChange={(event) => onMove(slide.id, Number(event.target.value))}
              className="cursor-pointer rounded-lg border border-[#CAC4D0]/60 bg-background p-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              {Array.from({ length: slideCount }, (_unused, position) => (
                <option key={position} value={position}>
                  {toOrdinalLabel(position)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isMutating}
          onClick={() => handleUpdate({ isActive: !slide.isActive })}
          className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {slide.isActive ? "Hide from home page" : "Show on home page"}
        </button>

        <button
          type="button"
          onClick={() => setIsEditing((wasEditing) => !wasEditing)}
          className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs"
        >
          {isEditing ? "Cancel edit" : "Edit"}
        </button>

        {/* Its own control, separate from Edit — so it is never ambiguous whether a save is
            about to touch the image. */}
        <label
          aria-disabled={isMutating}
          className={`rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs ${
            isMutating ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          {replaceImage.isPending ? "Replacing…" : "Replace image"}
          <input
            type="file"
            accept={ACCEPTED_SLIDE_IMAGE_TYPES}
            className="hidden"
            disabled={isMutating}
            onChange={(event) => {
              const selectedFile = event.target.files?.[0];
              if (selectedFile) replaceImage.mutate({ slideId: slide.id, imageFile: selectedFile });
              event.target.value = "";
            }}
          />
        </label>

        {isConfirmingDelete ? (
          <span className="flex items-center gap-2 text-xs">
            Really delete?
            <button
              type="button"
              disabled={isDeleting}
              onClick={onDelete}
              className="cursor-pointer rounded-full bg-red-600 px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="cursor-pointer rounded-full border border-red-200 px-3 py-1 text-xs text-red-700"
          >
            Delete
          </button>
        )}
      </div>

      {/*
        THE ROW'S OWN VERDICT, six inches from the button that caused it. Same components and
        same visual language as everywhere else in the console — the point is the position,
        not a new vocabulary.

        The SUCCESS notice matters more than it looks: a replacement image can resemble the one
        it replaced, so "Image replaced." is what tells the admin the write landed rather than
        leaving them to squint at a thumbnail. React Query clears mutation state on the next
        `mutate()`, so it needs no timer.
      */}
      {replaceImage.isPending && (
        <output className="block text-xs text-muted-foreground">Replacing image…</output>
      )}
      {rowError && <MutationErrorNotice error={rowError.apiError} />}
      {replaceImage.isSuccess && !replaceImage.isPending && (
        <MutationSuccessNotice message="Image replaced." />
      )}

      {isEditing && (
        <form
          className="space-y-3 border-t border-[#CAC4D0]/40 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleUpdate({
              altText: draftAltText,
              // Kind and value always travel together — the backend 422s a kind with no
              // value, because "/store" is a fine path and a broken URL.
              destinationKind: draftDestinationKind,
              destinationValue: draftDestinationValue,
            });
            setIsEditing(false);
          }}
        >
          <input
            type="text"
            required
            maxLength={200}
            value={draftAltText}
            onChange={(event) => setDraftAltText(event.target.value)}
            aria-label="Description"
            className="w-full rounded-xl border border-[#CAC4D0]/60 bg-background p-2 text-sm"
          />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`edit-destination-kind-${slide.id}`}
                checked={draftDestinationKind === "internal_path"}
                onChange={() => setDraftDestinationKind("internal_path")}
              />
              A page on Qatoto
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`edit-destination-kind-${slide.id}`}
                checked={draftDestinationKind === "external_url"}
                onChange={() => setDraftDestinationKind("external_url")}
              />
              An external website
            </label>
          </div>
          <input
            type="text"
            required
            value={draftDestinationValue}
            onChange={(event) => setDraftDestinationValue(event.target.value)}
            aria-label="Destination"
            className="w-full rounded-xl border border-[#CAC4D0]/60 bg-background p-2 text-sm"
          />
          <button
            type="submit"
            disabled={isMutating}
            className="cursor-pointer rounded-full bg-foreground px-4 py-1.5 text-xs text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save changes
          </button>
        </form>
      )}
    </li>
  );
}
