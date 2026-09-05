// TRANSPORT: client-query — the list, create, edit, reorder, activate/deactivate and delete
// all call hooks in `@/hooks/blueprints-hero`. The capability check reads `@/hooks/rnd/platform-roles`.
"use client";

import Image from "next/image";
import { useState } from "react";

import { AdminImagePicker } from "@/components/admin/shared/admin-image-picker";
import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useAdminBlueprintHeroSlidesQuery,
  useCreateBlueprintHeroSlideMutation,
  useDeleteBlueprintHeroSlideMutation,
  useReorderBlueprintHeroSlidesMutation,
  useReplaceBlueprintHeroSlideImageMutation,
  useUpdateBlueprintHeroSlideMutation,
} from "@/hooks/blueprints-hero";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  MAX_BLUEPRINT_HERO_SLIDES,
  type AdminBlueprintHeroSlide,
} from "@/lib/blueprints/hero.schemas";
import { ApiRequestError } from "@/lib/http";

/**
 * The list has a `restricted` variant the public queues do not need.
 *
 * This read is capability-gated: it exposes retired rows, scheduled slides and who authored
 * them, and the query is disabled without `manage_promotions`. "Nothing to show because you
 * may not look" is a different state from "nothing to show".
 */
type SlideListViewState =
  | { status: "loading" }
  | { status: "restricted" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; slides: AdminBlueprintHeroSlide[] };

function toSlideListViewState(
  canManage: boolean,
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data: AdminBlueprintHeroSlide[] | undefined;
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
          : "Couldn't load the Blueprints hero.",
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
 * A slide seeded by migration 0149 points at a file in this app's own `public/` directory
 * rather than at an uploaded asset. Worth saying on the row, because "Replace image" behaves
 * differently for one: it is how a seeded slide becomes a real upload.
 */
function isSeededImage(imageUrl: string): boolean {
  return imageUrl.startsWith("/");
}

/**
 * The /blueprints hero console.
 *
 * THREE CONTROLS ARE THE POINT — add a slide with a link, set which slide shows 1st / 2nd /
 * 3rd, and delete one. Everything else on a row (activate, edit, replace image) exists
 * because it costs nothing once those three do.
 *
 * `manage_promotions` IS ADMIN-ONLY, and this surface reuses it rather than inventing a
 * fourth grant: it is the same staff act with the same blast radius as the front-page
 * carousel and the Spotlight rail. Failing the capability degrades this page to read-only;
 * it does not hide it, matching every other console here.
 *
 * NOTHING IS OPTIMISTIC. Every control waits for the server and the list re-renders from its
 * answer, so what an admin sees after a reorder is exactly what /blueprints will serve.
 */
export default function BlueprintHeroSlideAdminPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canManageBlueprintHero =
    staffContextQuery.data?.capabilities.includes("manage_promotions") ?? false;

  const slidesQuery = useAdminBlueprintHeroSlidesQuery(canManageBlueprintHero);

  // THE PAGE OWNS ONLY LIST-LEVEL WRITES. Update and image-replace live inside SlideRow so
  // their errors render on the row the admin clicked rather than in one banner at the top of
  // the page. Reorder stays here on purpose: it sends the whole permutation, so its failure
  // belongs to the list, not to any single row.
  const createSlide = useCreateBlueprintHeroSlideMutation();
  const reorderSlides = useReorderBlueprintHeroSlidesMutation();
  const deleteSlide = useDeleteBlueprintHeroSlideMutation();

  const firstError = [createSlide.error, reorderSlides.error, deleteSlide.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const listState = toSlideListViewState(canManageBlueprintHero, {
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
        <h1 className="text-2xl font-semibold">Blueprints hero</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The rotating card at the top of the Blueprints page. Each slide is an image, the title
          shown over it, and the page it links to — usually a series at{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/blueprints/…</code>. The order
          here is the order visitors see.
        </p>
      </header>

      {/* Three distinct cases, said apart — a failed permission check is not the same as
          failing it. */}
      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so this page is read-only.
        </output>
      )}
      {staffContextQuery.isSuccess && !canManageBlueprintHero && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Managing the Blueprints hero needs the admin role. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so this page is read-only.
        </output>
      )}

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      {canManageBlueprintHero && (
        <CreateSlideForm
          isSubmitting={createSlide.isPending}
          slideCount={slidesQuery.data?.length ?? 0}
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
            No slides yet. The Blueprints page shows no hero until you add one.
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
 * Add a slide: the image, its title, and the page it links to, in one submit.
 *
 * THE LINK IS OPTIONAL, and the empty field is meaningful rather than lazy: a slide with no
 * link is decorative, which is the state all four seeded slides are in until there is an
 * blueprints to point them at. An empty string is normalized to `null` on submit, because
 * the backend 422s an empty path.
 *
 * There is no destination-KIND choice, unlike the promotional carousel. This surface links
 * only into the site — an external URL on the Blueprints page would be an open door on a content
 * surface rather than an ad slot — so the one field is always a path.
 */
function CreateSlideForm({
  isSubmitting,
  slideCount,
  onCreate,
}: {
  isSubmitting: boolean;
  slideCount: number;
  onCreate: (input: {
    imageFile: File;
    title: string;
    destinationPath: string | null;
    isActive: boolean;
  }) => void;
}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [destinationPath, setDestinationPath] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isCarouselFull = slideCount >= MAX_BLUEPRINT_HERO_SLIDES;

  return (
    <section className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <h2 className="text-lg font-medium">Add a slide</h2>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!imageFile || isCarouselFull) return;
          const trimmedDestination = destinationPath.trim();
          onCreate({
            imageFile,
            title,
            destinationPath: trimmedDestination.length === 0 ? null : trimmedDestination,
            isActive,
          });
          // Clearing `imageFile` is what resets the picker — it holds no file of its own once
          // one has passed, so `reset()` below has nothing of the image left to clear.
          setImageFile(null);
          setTitle("");
          setDestinationPath("");
          event.currentTarget.reset();
        }}
      >
        <div className="space-y-1">
          {/* `htmlFor` still points at a real input; the picker hides it rather than dropping
              it, so clicking the label opens the OS dialog exactly as before. */}
          <label htmlFor="blueprint-hero-slide-image" className="block text-sm font-medium">
            Image
          </label>
          <AdminImagePicker
            inputId="blueprint-hero-slide-image"
            isDisabled={isSubmitting || isCarouselFull}
            selectedFile={imageFile}
            onFileSelected={setImageFile}
          />
          <p className="text-xs text-muted-foreground">
            Shown in a 16:9 card, so a wide still works best. Portrait art gets cropped.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="blueprint-hero-slide-title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="blueprint-hero-slide-title"
            type="text"
            required
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="A Record Of Mortal's Journey To Immortality"
            className="w-full rounded-xl border border-[#CAC4D0]/60 bg-background p-2 text-sm"
          />
          {/* Not decoration: the image sits inside a link, so this text IS the link's
              accessible name for anyone not seeing the picture. */}
          <p className="text-xs text-muted-foreground">
            Shown over the image, and read aloud in place of it. Two lines fit.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="blueprint-hero-slide-destination" className="block text-sm font-medium">
            Links to <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="blueprint-hero-slide-destination"
            type="text"
            maxLength={512}
            value={destinationPath}
            onChange={(event) => setDestinationPath(event.target.value)}
            placeholder="/blueprints/solar-cold-storage-controller-teardown"
            className="w-full rounded-xl border border-[#CAC4D0]/60 bg-background p-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            A page on Qatoto, starting with a single slash. Leave blank for a slide that is not
            clickable.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Show on the Blueprints page straight away
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !imageFile || isCarouselFull}
            className="cursor-pointer rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Adding…" : "Add slide"}
          </button>
          <p className="text-xs text-muted-foreground">
            {isCarouselFull
              ? `The hero holds ${String(MAX_BLUEPRINT_HERO_SLIDES)} slides. Delete one to add another.`
              : `${String(slideCount)} of ${String(MAX_BLUEPRINT_HERO_SLIDES)} slides used.`}
          </p>
        </div>
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
  slide: AdminBlueprintHeroSlide;
  index: number;
  slideCount: number;
  isReordering: boolean;
  isDeleting: boolean;
  onMove: (slideId: string, targetIndex: number) => void;
  onDelete: () => void;
}) {
  /**
   * THE ROW OWNS ITS OWN WRITES, following the promotional console's hard-won arrangement:
   * when these two mutations lived on the page, a 422 from row three rendered in a single
   * banner beside the page heading — often scrolled off the top — while the row itself sat
   * unchanged, and one shared `isMutating` disabled the controls on every row.
   */
  const updateSlide = useUpdateBlueprintHeroSlideMutation();
  const replaceImage = useReplaceBlueprintHeroSlideImageMutation();

  const isMutating = updateSlide.isPending || replaceImage.isPending;
  const rowError = [replaceImage.error, updateSlide.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(slide.title);
  const [draftDestinationPath, setDraftDestinationPath] = useState(slide.destinationPath ?? "");
  // Two-step inline confirm. `window.confirm` is not available — oxlint sets no-alert: error.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  /**
   * Replacing is TWO STEPS, and the second one is the point: firing the mutation from the
   * file input's `change` event would mean the first time an admin sees the new image is
   * after it has already replaced the live one. Picking stages the file; the confirm sends it.
   */
  const [isReplacingImage, setIsReplacingImage] = useState(false);
  const [replacementImageFile, setReplacementImageFile] = useState<File | null>(null);

  function handleUpdate(patch: {
    title?: string;
    destinationPath?: string | null;
    isActive?: boolean;
  }) {
    updateSlide.mutate({ slideId: slide.id, patch });
  }

  return (
    <li className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="flex flex-wrap items-start gap-4">
        {/* `object-cover` on a 16:9 box, NOT `object-contain`: the live carousel covers
            (`blueprints-hero-carousel.tsx`), so a letterboxed thumbnail here would show framing
            the visitor never gets. */}
        <Image
          src={slide.imageUrl}
          width={160}
          height={90}
          alt=""
          unoptimized={slide.imageUrl.startsWith("https://")}
          className={`aspect-video w-40 rounded-lg bg-muted object-cover transition-opacity ${
            replaceImage.isPending ? "opacity-40" : ""
          }`}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {toOrdinalLabel(slide.position)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                slide.isActive ? "bg-green-100 text-green-900" : "bg-muted text-muted-foreground"
              }`}
            >
              {slide.isActive ? "Live" : "Hidden"}
            </span>
            {slide.destinationPath === null && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Not clickable</span>
            )}
            {isSeededImage(slide.imageUrl) && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Placeholder art</span>
            )}
          </div>
          <p className="truncate text-sm font-medium">{slide.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {slide.destinationPath ?? "No link"}
          </p>
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
          {slide.isActive ? "Hide from Blueprints page" : "Show on Blueprints page"}
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
        <button
          type="button"
          disabled={isMutating}
          onClick={() => {
            setIsReplacingImage((wasReplacing) => !wasReplacing);
            setReplacementImageFile(null);
          }}
          className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {replaceImage.isPending
            ? "Replacing…"
            : isReplacingImage
              ? "Cancel replace"
              : "Replace image"}
        </button>

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

      {isReplacingImage && (
        <div className="space-y-3 border-t border-[#CAC4D0]/40 pt-3">
          <p className="text-sm font-medium">New image</p>
          {isSeededImage(slide.imageUrl) && (
            <p className="text-xs text-muted-foreground">
              This slide still uses placeholder art shipped with the site. Uploading here replaces
              it with a real image.
            </p>
          )}
          <AdminImagePicker
            inputId={`replace-blueprint-hero-image-${slide.id}`}
            isDisabled={isMutating}
            selectedFile={replacementImageFile}
            onFileSelected={setReplacementImageFile}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isMutating || replacementImageFile === null}
              onClick={() => {
                if (replacementImageFile === null) return;
                replaceImage.mutate(
                  { slideId: slide.id, imageFile: replacementImageFile },
                  {
                    // Closing on SUCCESS ONLY. A failed replace leaves the panel open with
                    // the file still staged, so the admin retries rather than re-picking —
                    // and the row's own error notice sits directly beneath it.
                    onSuccess: () => {
                      setIsReplacingImage(false);
                      setReplacementImageFile(null);
                    },
                  },
                );
              }}
              className="cursor-pointer rounded-full bg-foreground px-4 py-1.5 text-xs text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {replaceImage.isPending ? "Replacing…" : "Replace image"}
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={() => {
                setIsReplacingImage(false);
                setReplacementImageFile(null);
              }}
              className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/*
        THE ROW'S OWN VERDICT, six inches from the button that caused it. The SUCCESS notice
        matters more than it looks: a replacement image can resemble the one it replaced, so
        "Image replaced." is what tells the admin the write landed rather than leaving them to
        squint at a thumbnail. React Query clears mutation state on the next `mutate()`, so it
        needs no timer.
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
            const trimmedDestination = draftDestinationPath.trim();
            handleUpdate({
              title: draftTitle,
              // An emptied field CLEARS the link — `null` and absent are different edits on
              // this route, and the backend 422s an empty string.
              destinationPath: trimmedDestination.length === 0 ? null : trimmedDestination,
            });
            setIsEditing(false);
          }}
        >
          <input
            type="text"
            required
            maxLength={160}
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            aria-label="Title"
            className="w-full rounded-xl border border-[#CAC4D0]/60 bg-background p-2 text-sm"
          />
          <input
            type="text"
            maxLength={512}
            value={draftDestinationPath}
            onChange={(event) => setDraftDestinationPath(event.target.value)}
            placeholder="/blueprints/solar-cold-storage-controller-teardown"
            aria-label="Links to"
            className="w-full rounded-xl border border-[#CAC4D0]/60 bg-background p-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Clear this field to make the slide non-clickable.
          </p>
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
