// TRANSPORT: client-query — the tree, the request queue, create, edit, reorder, image
// replace, retire and both verdicts all call hooks in `@/hooks/store/admin-categories`. The
// capability check reads `@/hooks/rnd/platform-roles`.
"use client";

import { useState } from "react";

import { AdminImagePicker } from "@/components/admin/shared/admin-image-picker";
import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useAdminStoreCategoriesQuery,
  useAdminStoreCategoryRequestsQuery,
  useAdminCategoryAttributesQuery,
  useCreateCategoryAttributeMutation,
  useCreateStoreCategoryMutation,
  useDecideStoreCategoryRequestMutation,
  useReorderStoreCategoriesMutation,
  useReplaceStoreCategoryImageMutation,
  useRetireStoreCategoryMutation,
  useUpdateCategoryAttributeMutation,
  useUpdateStoreCategoryMutation,
} from "@/hooks/store/admin-categories";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import { ApiRequestError } from "@/lib/http";
import {
  CategoryAttributeValueKindSchema,
  type CategoryAttributeValueKind,
} from "@/lib/store/catalog.schemas";
import {
  CommerceCategoryStateSchema,
  toAttributeKey,
  toCategorySlug,
  type AdminStoreCategory,
  type CommerceCategoryRequest,
  type DecideStoreCategoryRequestInput,
} from "@/lib/store/admin-categories.schemas";

/**
 * The categories a shopper sees on the store home, as a count.
 *
 * The server decides which ones by `siblingOrder` and answers `?limit=`; this mirrors the
 * number ONLY to draw the "above the fold" divider in the root list. It is not enforcement —
 * it is the admin being able to see where the rail stops.
 */
const HOME_RAIL_CATEGORY_LIMIT = 8;

/**
 * `misc` is seeded by migration 0098 with this fixed id and cannot be retired: it is where
 * listings wait while a category request is reviewed. Mirrored here to disable the control
 * rather than spend a round trip on a 409 the server will certainly return.
 */
const MISC_CATEGORY_ID = "commerce_category_misc";

/**
 * Both lists carry a `restricted` variant, and it wins over `loading`.
 *
 * Unlike `/admin/categories`, whose R&D queues are PUBLIC reads any staff member may see,
 * neither read here is public: the tree exposes draft and retired rows, and the queue
 * exposes who asked for what before anyone has agreed to it. Both are capability-gated and
 * the queries are disabled without it. "Nothing to show because you may not look" is a
 * different state from "nothing to show".
 */
type CategoryTreeViewState =
  | { status: "loading" }
  | { status: "restricted" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; categories: AdminStoreCategory[] };

type RequestQueueViewState =
  | { status: "loading" }
  | { status: "restricted" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; requests: CommerceCategoryRequest[] };

function toCategoryTreeViewState(
  canManage: boolean,
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data: { items: AdminStoreCategory[] } | undefined;
  },
): CategoryTreeViewState {
  if (!canManage) return { status: "restricted" };
  if (query.isPending) return { status: "loading" };
  if (query.isError || query.data === undefined) {
    return {
      status: "error",
      message:
        query.error instanceof ApiRequestError
          ? query.error.apiError.message
          : "Couldn't load the categories.",
    };
  }
  return query.data.items.length === 0
    ? { status: "empty" }
    : { status: "ready", categories: query.data.items };
}

function toRequestQueueViewState(
  canManage: boolean,
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data: CommerceCategoryRequest[] | undefined;
  },
): RequestQueueViewState {
  if (!canManage) return { status: "restricted" };
  if (query.isPending) return { status: "loading" };
  if (query.isError || query.data === undefined) {
    return {
      status: "error",
      message:
        query.error instanceof ApiRequestError
          ? query.error.apiError.message
          : "Couldn't load the request queue.",
    };
  }
  return query.data.length === 0 ? { status: "empty" } : { status: "ready", requests: query.data };
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
 * The store-category console.
 *
 * THREE CONTROLS ARE THE POINT — add a category with a tile image, set the order the store
 * home renders them in, and answer the sellers asking for one that does not exist.
 * Everything else on a row (rename, re-parent, change state, replace image, retire) exists
 * because it costs nothing once those three do.
 *
 * `moderate_commerce` GATES IT, not `manage_promotions`. Both are front-of-store, but a
 * promotional slide can point at an arbitrary external URL and only `admin` holds that. A
 * category is internal structure over the catalogue — the moderator's ordinary job, and the
 * same capability that already gates pathway moderation. Failing it degrades this page to
 * read-only; it does not hide it, matching every other console here.
 *
 * NOTHING IS OPTIMISTIC. Every control waits for the server and the lists re-render from its
 * answer, so what an admin sees after a reorder is exactly what the store will serve. That
 * matters most on the verdict: approving a request MOVES a stranger's listings, and guessing
 * that outcome locally would show a shuffle that may not have happened.
 */
export default function StoreCategoryAdminPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const canManageCategories =
    staffContextQuery.data?.capabilities.includes("moderate_commerce") ?? false;

  const categoriesQuery = useAdminStoreCategoriesQuery(canManageCategories);
  const requestsQuery = useAdminStoreCategoryRequestsQuery(canManageCategories, "pending");

  // THE PAGE OWNS ONLY LIST-LEVEL WRITES. Update, image-replace and retire live inside
  // CategoryRow, so their errors render on the row the admin clicked rather than in one
  // banner at the top. Reorder stays here on purpose: it sends the whole permutation, so its
  // failure belongs to the list and not to any single row.
  const createCategory = useCreateStoreCategoryMutation();
  const reorderCategories = useReorderStoreCategoriesMutation();

  const firstError = [createCategory.error, reorderCategories.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const treeState = toCategoryTreeViewState(canManageCategories, {
    isPending: categoriesQuery.isPending,
    isError: categoriesQuery.isError,
    error: categoriesQuery.error,
    data: categoriesQuery.data,
  });

  const queueState = toRequestQueueViewState(canManageCategories, {
    isPending: requestsQuery.isPending,
    isError: requestsQuery.isError,
    error: requestsQuery.error,
    data: requestsQuery.data,
  });

  const allCategories = categoriesQuery.data?.items ?? [];
  // Only ACTIVE categories are offered as an assignment target: pointing a listing at a draft
  // or retired row would hide it rather than move it, which is what the backend refuses too.
  const assignableCategories = allCategories.filter((category) => category.state === "active");
  const rootCategories = allCategories
    .filter((category) => category.parentCategoryId === null)
    .toSorted((left, right) => left.siblingOrder - right.siblingOrder);
  const rootCategoryIds = rootCategories.map((category) => category.id);

  /**
   * Moves one root to a new index and sends the WHOLE resulting order.
   *
   * Both the arrows and the "Show as" select come through here, so there is one place the
   * permutation is computed. A per-row order write would leave a window where two siblings
   * claim the same slot — and that slot is protected by a UNIQUE index, so the loser is
   * rejected at random rather than merely being second.
   *
   * ROOTS ONLY. Child ordering is per-parent and would need its own control; the store home
   * renders roots, so that is the order worth an arrow today. The route already takes a
   * `parentCategoryId`, so adding it later changes no contract.
   */
  function handleMoveRootCategory(categoryId: string, targetIndex: number) {
    const currentIndex = rootCategoryIds.indexOf(categoryId);
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= rootCategoryIds.length) {
      return;
    }
    const reordered = [...rootCategoryIds];
    reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, categoryId);
    reorderCategories.mutate({ parentCategoryId: null, categoryIds: reordered });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Store categories</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          What the store browses by. The first {String(HOME_RAIL_CATEGORY_LIMIT)} top-level
          categories in this order are the row on the store home; the rest are reachable from
          &ldquo;All categories&rdquo;.
        </p>
      </header>

      {/* Three distinct cases, said apart — a failed permission check is not the same as
          failing it. */}
      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so this page is read-only.
        </output>
      )}
      {staffContextQuery.isSuccess && !canManageCategories && (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Managing store categories needs the moderator or admin role. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so this page is read-only.
        </output>
      )}

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      {canManageCategories && (
        <CreateCategoryForm
          isSubmitting={createCategory.isPending}
          parentOptions={assignableCategories}
          onCreate={(input) => {
            createCategory.mutate(input);
          }}
        />
      )}

      <RequestQueueSection
        state={queueState}
        assignableCategories={assignableCategories}
        canDecide={canManageCategories}
      />

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">Categories</h2>
          <p className="text-xs text-muted-foreground">
            Top-level order sets the store home row. Sub-categories are listed under their parent
            and keep their own order.
          </p>
        </div>
        {renderTree()}
      </section>
    </div>
  );

  function renderTree() {
    switch (treeState.status) {
      case "restricted":
        return (
          <p className="text-sm text-muted-foreground">
            Sign in with a moderator or admin account to see the categories.
          </p>
        );
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading…</p>;
      case "error":
        return (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {treeState.message}
          </p>
        );
      case "empty":
        return <p className="text-sm text-muted-foreground">No categories yet.</p>;
      case "ready":
        return (
          <ul className="space-y-3">
            {rootCategories.map((rootCategory, rootIndex) => (
              <li key={rootCategory.id} className="space-y-3">
                <CategoryRow
                  category={rootCategory}
                  displayIndex={rootIndex}
                  siblingCount={rootCategories.length}
                  isOnHomeRail={rootIndex < HOME_RAIL_CATEGORY_LIMIT}
                  isReordering={reorderCategories.isPending}
                  parentOptions={assignableCategories}
                  canManage={canManageCategories}
                  onMove={handleMoveRootCategory}
                />
                {renderChildren(rootCategory.id)}
              </li>
            ))}
            {/* Non-root categories whose parent is missing from this list cannot happen —
                the read returns the whole tree — so there is no orphan bucket to render. */}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = treeState;
        return exhaustiveCheck;
      }
    }
  }

  function renderChildren(parentCategoryId: string) {
    const children = allCategories
      .filter((category) => category.parentCategoryId === parentCategoryId)
      .toSorted((left, right) => left.siblingOrder - right.siblingOrder);
    if (children.length === 0) return null;

    return (
      <ul className="ml-6 space-y-3 border-l border-[#CAC4D0]/60 pl-4">
        {children.map((childCategory, childIndex) => (
          <li key={childCategory.id}>
            <CategoryRow
              category={childCategory}
              displayIndex={childIndex}
              siblingCount={children.length}
              isOnHomeRail={false}
              isReordering={reorderCategories.isPending}
              parentOptions={assignableCategories}
              canManage={canManageCategories}
              // Child reorder has no control yet — see `handleMoveRootCategory`. Passing
              // null rather than a no-op keeps the arrows out of the DOM instead of
              // rendering buttons that do nothing.
              onMove={null}
            />
          </li>
        ))}
      </ul>
    );
  }
}

/**
 * Add a category.
 *
 * THE SLUG IS PROPOSED FROM THE NAME AND STAYS EDITABLE, because it is the one field that
 * cannot be changed afterwards — it is a public URL identity, linked and indexed the moment
 * the category is published, and the update route has no `slug` key at all. Auto-filling it
 * silently would hand that permanence to a typo.
 */
function CreateCategoryForm({
  isSubmitting,
  parentOptions,
  onCreate,
}: {
  isSubmitting: boolean;
  parentOptions: readonly AdminStoreCategory[];
  onCreate: (input: {
    name: string;
    slug: string;
    parentCategoryId: string | null;
    searchSynonyms: readonly string[];
    state: "draft" | "active";
    imageFile: File | null;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [hasEditedSlug, setHasEditedSlug] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [searchSynonyms, setSearchSynonyms] = useState("");
  const [state, setState] = useState<"draft" | "active">("draft");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const canSubmit = !isSubmitting && trimmedName.length > 0 && trimmedSlug.length >= 2;

  return (
    <section className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <h2 className="text-lg font-medium">Add a category</h2>

      <label className="block space-y-1 text-xs">
        <span className="font-medium">Name</span>
        <input
          value={name}
          onChange={(changeEvent) => {
            setName(changeEvent.target.value);
            // Follows the name until the admin takes the slug over, then never again.
            if (!hasEditedSlug) setSlug(toCategorySlug(changeEvent.target.value));
          }}
          maxLength={120}
          className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
        />
      </label>

      <label className="block space-y-1 text-xs">
        <span className="font-medium">Slug — permanent, and part of the public URL</span>
        <input
          value={slug}
          onChange={(changeEvent) => {
            setHasEditedSlug(true);
            setSlug(changeEvent.target.value);
          }}
          maxLength={100}
          className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 font-mono text-sm"
        />
        <span className="block text-[10px] text-muted-foreground">
          /store/categories/{trimmedSlug === "" ? "…" : trimmedSlug} — this cannot be changed later.
          Lowercase words joined by single hyphens.
        </span>
      </label>

      <label className="block space-y-1 text-xs">
        <span className="font-medium">Parent</span>
        <select
          value={parentCategoryId}
          onChange={(changeEvent) => setParentCategoryId(changeEvent.target.value)}
          className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
        >
          <option value="">No parent — a top-level category</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-xs">
        <span className="font-medium">Search synonyms (comma separated, optional)</span>
        <input
          value={searchSynonyms}
          onChange={(changeEvent) => setSearchSynonyms(changeEvent.target.value)}
          maxLength={2048}
          placeholder="sofa, couch, settee"
          className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
        />
      </label>

      <fieldset className="space-y-1 text-xs">
        <legend className="font-medium">Publish state</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="new-category-state"
            checked={state === "draft"}
            onChange={() => setState("draft")}
          />
          <span>Draft — not browsable yet</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="new-category-state"
            checked={state === "active"}
            onChange={() => setState("active")}
          />
          <span>Active — live in the store immediately</span>
        </label>
      </fieldset>

      <div className="space-y-1 text-xs">
        <span className="font-medium">Tile image (optional)</span>
        {/* Square, because that is what a category tile renders as — a 16:9 preview would
            show framing the shopper never gets. */}
        <AdminImagePicker
          inputId="new-category-image"
          isDisabled={isSubmitting}
          selectedFile={imageFile}
          onFileSelected={setImageFile}
          previewAspectClassName="aspect-square"
        />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          onCreate({
            name: trimmedName,
            slug: trimmedSlug,
            parentCategoryId: parentCategoryId === "" ? null : parentCategoryId,
            searchSynonyms: searchSynonyms
              .split(",")
              .map((synonym) => synonym.trim())
              .filter((synonym) => synonym.length > 0),
            state,
            imageFile,
          });
          setName("");
          setSlug("");
          setHasEditedSlug(false);
          setParentCategoryId("");
          setSearchSynonyms("");
          setState("draft");
          setImageFile(null);
        }}
        className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Adding…" : "Add category"}
      </button>
    </section>
  );
}

/**
 * One category, with every per-row write it owns.
 *
 * THE ROW OWNS ITS OWN MUTATIONS, and that is deliberate rather than incidental. Hoisting
 * them to the page would put a rename failure in a banner at the top of a list of twenty
 * rows, with nothing saying which one it belonged to. Reorder is the exception and stays on
 * the page, because it sends the whole permutation and its failure really is the list's.
 */
function CategoryRow({
  category,
  displayIndex,
  siblingCount,
  isOnHomeRail,
  isReordering,
  parentOptions,
  canManage,
  onMove,
}: {
  category: AdminStoreCategory;
  displayIndex: number;
  siblingCount: number;
  isOnHomeRail: boolean;
  isReordering: boolean;
  parentOptions: readonly AdminStoreCategory[];
  canManage: boolean;
  /** Null where no reorder control exists for this level yet. */
  onMove: ((categoryId: string, targetIndex: number) => void) | null;
}) {
  const updateCategory = useUpdateStoreCategoryMutation();
  const replaceImage = useReplaceStoreCategoryImageMutation();
  const retireCategory = useRetireStoreCategoryMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(category.name);
  const [draftParentCategoryId, setDraftParentCategoryId] = useState(
    category.parentCategoryId ?? "",
  );
  const [draftSynonyms, setDraftSynonyms] = useState(category.searchSynonyms.join(", "));
  const [isReplacingImage, setIsReplacingImage] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [isConfirmingRetire, setIsConfirmingRetire] = useState(false);
  const [isEditingAttributes, setIsEditingAttributes] = useState(false);

  const rowError = [updateCategory.error, replaceImage.error, retireCategory.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const isBusy = updateCategory.isPending || replaceImage.isPending || retireCategory.isPending;
  // `misc` is the parking bay for listings awaiting a verdict. The server refuses to retire
  // it; disabling here saves the round trip and says why.
  const isProtected = category.id === MISC_CATEGORY_ID;

  return (
    <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-[#CAC4D0]/60 bg-muted">
          {category.imageUrl === null ? (
            <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
              No art
            </span>
          ) : (
            // A plain <img>: the URL is remote and already sized, and this is a 64px
            // administrative thumbnail rather than a rendered storefront tile.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={category.imageUrl} alt="" className="size-full object-cover" />
          )}
        </div>

        <div className="min-w-48 flex-1 space-y-1">
          <p className="text-sm font-medium">{category.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{category.slug}</p>
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-full bg-muted px-2 py-0.5">
              {toOrdinalLabel(displayIndex)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 ${
                category.state === "active"
                  ? "bg-[#00696E]/10 text-[#00393C]"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {category.state}
            </span>
            {isOnHomeRail && (
              <span className="rounded-full bg-[#1DBDC5]/15 px-2 py-0.5">On store home</span>
            )}
            {/* Both counts are what the retire guard checks, so showing them is showing the
                reason a retire will or will not work — before it is attempted. */}
            <span className="text-muted-foreground">
              {String(category.productCount)} listings · {String(category.childCount)}{" "}
              sub-categories
            </span>
          </div>
        </div>
      </div>

      {rowError && <MutationErrorNotice error={rowError.apiError} />}

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          {onMove !== null && (
            <>
              <button
                type="button"
                disabled={isReordering || displayIndex === 0}
                onClick={() => onMove(category.id, displayIndex - 1)}
                className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Move up
              </button>
              <button
                type="button"
                disabled={isReordering || displayIndex === siblingCount - 1}
                onClick={() => onMove(category.id, displayIndex + 1)}
                className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Move down
              </button>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                Show as
                <select
                  value={displayIndex}
                  disabled={isReordering}
                  onChange={(changeEvent) => onMove(category.id, Number(changeEvent.target.value))}
                  className="rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
                >
                  {Array.from({ length: siblingCount }, (_unused, index) => (
                    <option key={index} value={index}>
                      {toOrdinalLabel(index)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <button
            type="button"
            disabled={isBusy}
            onClick={() => setIsEditing((wasEditing) => !wasEditing)}
            className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? "Cancel edit" : "Edit"}
          </button>

          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            State
            <select
              value={category.state}
              disabled={isBusy}
              onChange={(changeEvent) => {
                // Parsed, not asserted. The select can only offer the three enum values, but
                // proving that here is what keeps a future fourth `<option>` from shipping a
                // 422 instead of a compile error.
                const parsedState = CommerceCategoryStateSchema.safeParse(changeEvent.target.value);
                if (!parsedState.success) return;
                updateCategory.mutate({
                  categoryId: category.id,
                  patch: { state: parsedState.data },
                });
              }}
              className="rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="retired">retired</option>
            </select>
          </label>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => setIsReplacingImage((wasReplacing) => !wasReplacing)}
            className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isReplacingImage ? "Cancel image" : "Replace image"}
          </button>

          {/* STORE §20. The fourth toggle on this row, same trio as the three above it. */}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setIsEditingAttributes((wasEditing) => !wasEditing)}
            className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditingAttributes ? "Hide fields" : "Fields"}
          </button>

          {/* TWO-STEP CONFIRM, not a `window.confirm` — oxlint's `no-alert` forbids that, and
              a browser dialog blocks the whole tab anyway. */}
          {isProtected ? (
            <span className="text-[10px] text-muted-foreground">
              Misc can&apos;t be retired — listings wait here during review.
            </span>
          ) : isConfirmingRetire ? (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  retireCategory.mutate(category.id);
                  setIsConfirmingRetire(false);
                }}
                className="cursor-pointer rounded-full bg-[#BA1A1A] px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm retire
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingRetire(false)}
                className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs"
              >
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isBusy || category.state === "retired"}
              onClick={() => setIsConfirmingRetire(true)}
              className="cursor-pointer rounded-full border border-[#BA1A1A] px-3 py-1 text-xs text-[#BA1A1A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retire
            </button>
          )}
        </div>
      )}

      {canManage && isEditing && (
        <div className="space-y-2 rounded-xl border border-[#CAC4D0]/60 p-3">
          <label className="block space-y-1 text-xs">
            <span className="font-medium">Name</span>
            <input
              value={draftName}
              onChange={(changeEvent) => setDraftName(changeEvent.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Parent</span>
            <select
              value={draftParentCategoryId}
              onChange={(changeEvent) => setDraftParentCategoryId(changeEvent.target.value)}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            >
              <option value="">No parent — a top-level category</option>
              {parentOptions
                .filter((option) => option.id !== category.id)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Search synonyms (comma separated)</span>
            <input
              value={draftSynonyms}
              onChange={(changeEvent) => setDraftSynonyms(changeEvent.target.value)}
              maxLength={2048}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          <p className="text-[10px] text-muted-foreground">
            The slug is permanent and is not editable — a category that needs a different slug is a
            new category.
          </p>

          <button
            type="button"
            disabled={isBusy || draftName.trim().length === 0}
            onClick={() => {
              updateCategory.mutate({
                categoryId: category.id,
                patch: {
                  name: draftName.trim(),
                  parentCategoryId: draftParentCategoryId === "" ? null : draftParentCategoryId,
                  searchSynonyms: draftSynonyms
                    .split(",")
                    .map((synonym) => synonym.trim())
                    .filter((synonym) => synonym.length > 0),
                },
              });
              setIsEditing(false);
            }}
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateCategory.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {canManage && isReplacingImage && (
        <div className="space-y-2 rounded-xl border border-[#CAC4D0]/60 p-3">
          <AdminImagePicker
            inputId={`replace-image-${category.id}`}
            isDisabled={replaceImage.isPending}
            selectedFile={replacementFile}
            onFileSelected={setReplacementFile}
            previewAspectClassName="aspect-square"
          />
          <button
            type="button"
            disabled={replacementFile === null || replaceImage.isPending}
            onClick={() => {
              if (replacementFile === null) return;
              replaceImage.mutate({ categoryId: category.id, imageFile: replacementFile });
              setReplacementFile(null);
              setIsReplacingImage(false);
            }}
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {replaceImage.isPending ? "Uploading…" : "Replace image"}
          </button>
        </div>
      )}

      {/*
        Mounted only while open, so the resolved-attribute read fires when an admin asks for it
        rather than once per row on every page load.
      */}
      {canManage && isEditingAttributes && <CategoryAttributesPanel category={category} />}
    </div>
  );
}

/**
 * STORE §20. One category's attribute vocabulary.
 *
 * Its own component rather than more lines inside `CategoryRow`, because it owns two mutations and
 * a query of its own, and the row is already at three toggles.
 */
function CategoryAttributesPanel({ category }: { category: AdminStoreCategory }) {
  const attributesQuery = useAdminCategoryAttributesQuery(category.id, true);
  const createAttribute = useCreateCategoryAttributeMutation();
  const updateAttribute = useUpdateCategoryAttributeMutation();

  const [label, setLabel] = useState("");
  const [attributeKey, setAttributeKey] = useState("");
  const [hasEditedKey, setHasEditedKey] = useState(false);
  const [groupLabel, setGroupLabel] = useState("");
  const [valueKind, setValueKind] = useState<CategoryAttributeValueKind>("enum");
  const [unitLabel, setUnitLabel] = useState("");
  const [numericScale, setNumericScale] = useState("0");
  const [choiceLabels, setChoiceLabels] = useState("");

  const panelError = [createAttribute.error, updateAttribute.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );
  const isBusy = createAttribute.isPending || updateAttribute.isPending;

  const attributes = attributesQuery.data ?? [];
  const trimmedLabel = label.trim();
  const trimmedKey = attributeKey.trim();
  /**
   * An `enum` with no choices is unanswerable — the seller's select would have only "Not stated" —
   * so the form insists here rather than letting the backend accept a dead attribute.
   */
  const parsedChoices = choiceLabels
    .split(",")
    .map((choice) => choice.trim())
    .filter((choice) => choice.length > 0)
    .map((choice) => ({ choiceValue: toAttributeKey(choice), label: choice }));
  const canSubmit =
    !isBusy &&
    trimmedLabel.length > 0 &&
    trimmedKey.length > 0 &&
    (valueKind !== "enum" || parsedChoices.length >= 2);

  return (
    <div className="space-y-3 rounded-xl border border-[#CAC4D0]/60 p-3">
      {panelError && <MutationErrorNotice error={panelError.apiError} />}

      {attributesQuery.isPending ? (
        <p className="text-xs text-muted-foreground">Loading attributes…</p>
      ) : attributes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          This category asks for nothing yet, so its listings render no extra filters. Add a field
          below.
        </p>
      ) : (
        <ul className="space-y-2">
          {attributes.map((attribute) => (
            <li
              key={attribute.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-[#CAC4D0]/60 p-2 text-xs"
            >
              <span className="min-w-32 flex-1">
                <span className="font-medium">{attribute.label}</span>{" "}
                <span className="font-mono text-[10px] text-muted-foreground">
                  {attribute.attributeKey}
                </span>
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                {attribute.valueKind}
                {attribute.unitLabel === null ? "" : ` · ${attribute.unitLabel}`}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {attribute.valueCount} answered
              </span>

              {attribute.isInherited ? (
                /*
                  ⚠️ INHERITED ROWS ARE READ-ONLY HERE, and that is a rule rather than a shortcut.
                  The row belongs to an ANCESTOR category; editing it from a child would rewrite the
                  parent's vocabulary for every sibling leaf under it. The admin edits it where it
                  is defined.
                */
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  Inherited — edit it on the category that defines it
                </span>
              ) : (
                <>
                  {/*
                    A `text` attribute has no filterable toggle at all: the backend refuses it
                    (`ATTRIBUTE_NOT_FILTERABLE_KIND`), because free text yields one chip per
                    spelling. A control that can only ever error is worse than no control.
                  */}
                  {attribute.valueKind !== "text" && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        updateAttribute.mutate({
                          attributeId: attribute.id,
                          patch: { isFilterable: !attribute.isFilterable },
                        })
                      }
                      className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {attribute.isFilterable ? "Filterable ✓" : "Not filterable"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      updateAttribute.mutate({
                        attributeId: attribute.id,
                        patch: { isRequiredForPublish: !attribute.isRequiredForPublish },
                      })
                    }
                    className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {attribute.isRequiredForPublish ? "Required ✓" : "Optional"}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/*
        ⚠️ NO DELETE CONTROL ANYWHERE ON THIS PANEL. `commerce_product_attribute_value.attribute_id`
        is ON DELETE RESTRICT, so a definition any listing has answered cannot be removed — there is
        no route for it. Turning off "Filterable" takes it out of browse and is reversible, which is
        the honest exit.
      */}
      <p className="text-[10px] text-muted-foreground">
        Attributes cannot be deleted once listings answer them — turn off Filterable to take one out
        of browse instead. Requiring one blocks publishing until every listing here answers it.
      </p>

      <div className="space-y-2 rounded-lg border border-[#CAC4D0]/60 p-2">
        <span className="text-xs font-medium">Add a field</span>

        <label className="block space-y-1 text-xs">
          <span className="font-medium">Label</span>
          <input
            value={label}
            onChange={(changeEvent) => {
              setLabel(changeEvent.target.value);
              // Follows the label until the admin takes the key over, then never again — the same
              // latch the slug field uses on the create-category form.
              if (!hasEditedKey) setAttributeKey(toAttributeKey(changeEvent.target.value));
            }}
            maxLength={120}
            placeholder="Wood type"
            className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1 text-xs">
          <span className="font-medium">Key</span>
          <input
            value={attributeKey}
            onChange={(changeEvent) => {
              setHasEditedKey(true);
              setAttributeKey(changeEvent.target.value);
            }}
            maxLength={64}
            className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 font-mono text-sm"
          />
          <span className="block text-[10px] text-muted-foreground">
            snake_case, and permanent — a saved filter link names it. A field needing a different
            key is a new field.
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <label className="block space-y-1 text-xs">
            <span className="font-medium">Kind</span>
            <select
              value={valueKind}
              onChange={(changeEvent) => {
                // Parsed, not asserted — the same discipline the category state select uses.
                const parsedKind = CategoryAttributeValueKindSchema.safeParse(
                  changeEvent.target.value,
                );
                if (!parsedKind.success) return;
                setValueKind(parsedKind.data);
              }}
              className="rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
            >
              <option value="enum">enum — a fixed list</option>
              <option value="number">number — a measurement</option>
              <option value="text">text — free text, not filterable</option>
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Group</span>
            <input
              value={groupLabel}
              onChange={(changeEvent) => setGroupLabel(changeEvent.target.value)}
              maxLength={80}
              placeholder="Materials"
              className="rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
            />
          </label>

          {/* Unit and scale belong to `number` and the backend refuses them elsewhere. */}
          {valueKind === "number" && (
            <>
              <label className="block space-y-1 text-xs">
                <span className="font-medium">Unit</span>
                <input
                  value={unitLabel}
                  onChange={(changeEvent) => setUnitLabel(changeEvent.target.value)}
                  maxLength={24}
                  placeholder="mm"
                  className="w-20 rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="font-medium">Decimals</span>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={numericScale}
                  onChange={(changeEvent) => setNumericScale(changeEvent.target.value)}
                  className="w-20 rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
                />
              </label>
            </>
          )}
        </div>

        {valueKind === "enum" && (
          <label className="block space-y-1 text-xs">
            <span className="font-medium">Choices (comma separated)</span>
            <input
              value={choiceLabels}
              onChange={(changeEvent) => setChoiceLabels(changeEvent.target.value)}
              placeholder="Oak, Pine, Walnut"
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
            <span className="block text-[10px] text-muted-foreground">
              At least two — one choice is not a filter, and the chip row hides a single-bucket
              facet anyway.
            </span>
          </label>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            createAttribute.mutate({
              categoryId: category.id,
              input: {
                attributeKey: trimmedKey,
                label: trimmedLabel,
                groupLabel: groupLabel.trim() === "" ? null : groupLabel.trim(),
                valueKind,
                // Both are `number`-only; sending them otherwise is a 422 the form can avoid.
                unitLabel:
                  valueKind === "number" && unitLabel.trim() !== "" ? unitLabel.trim() : null,
                numericScale: valueKind === "number" ? Number(numericScale) : null,
                // New fields start out of browse and optional: making one filterable or required
                // the instant it exists would change the storefront before anybody has answered it.
                isFilterable: false,
                isRequiredForPublish: false,
                choices: valueKind === "enum" ? parsedChoices : [],
              },
            });
            setLabel("");
            setAttributeKey("");
            setHasEditedKey(false);
            setGroupLabel("");
            setUnitLabel("");
            setNumericScale("0");
            setChoiceLabels("");
          }}
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createAttribute.isPending ? "Adding…" : "Add field"}
        </button>
      </div>
    </div>
  );
}

/** The seller-request moderation queue. */
function RequestQueueSection({
  state,
  assignableCategories,
  canDecide,
}: {
  state: RequestQueueViewState;
  assignableCategories: readonly AdminStoreCategory[];
  canDecide: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">Category requests</h2>
        <p className="text-xs text-muted-foreground">
          Sellers asking for a category that does not exist. Their listings are live already and
          sitting in Misc; approving moves <strong>only those listings</strong> into the new
          category, never the rest of Misc.
        </p>
      </div>
      {renderQueue()}
    </section>
  );

  function renderQueue() {
    switch (state.status) {
      case "restricted":
        return (
          <p className="text-sm text-muted-foreground">
            Sign in with a moderator or admin account to see the queue.
          </p>
        );
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading…</p>;
      case "error":
        return (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {state.message}
          </p>
        );
      case "empty":
        return <p className="text-sm text-muted-foreground">Nothing awaiting review.</p>;
      case "ready":
        return (
          <ul className="space-y-3">
            {state.requests.map((request) => (
              <PendingRequestCard
                key={request.id}
                request={request}
                assignableCategories={assignableCategories}
                canDecide={canDecide}
              />
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = state;
        return exhaustiveCheck;
      }
    }
  }
}

/**
 * One pending request and its verdict.
 *
 * THE MODERATOR'S EDIT IS THE POINT. The name and parent default to what the seller proposed
 * and are both editable before approving — "Solar Cold-Storage" arriving as "solar cold
 * storage stuff" should become the former without a second round trip through the seller.
 * The slug is proposed from whichever name ends up in the field and stays editable, because
 * it is permanent.
 *
 * A REJECTION REQUIRES A NOTE and an approval does not, mirroring the backend's own body
 * schema rather than inventing a stricter rule here.
 */
function PendingRequestCard({
  request,
  assignableCategories,
  canDecide,
}: {
  request: CommerceCategoryRequest;
  assignableCategories: readonly AdminStoreCategory[];
  canDecide: boolean;
}) {
  const decideRequest = useDecideStoreCategoryRequestMutation();

  const [name, setName] = useState(request.proposedName);
  const [slug, setSlug] = useState(toCategorySlug(request.proposedName));
  const [hasEditedSlug, setHasEditedSlug] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState(request.proposedParentCategoryId ?? "");
  const [note, setNote] = useState("");
  /**
   * Per-listing overrides, keyed by product id. A missing key — the default for every
   * listing — means "wherever this verdict sends them", which is the new category on an
   * approval and Misc on a rejection.
   */
  const [productTargets, setProductTargets] = useState<Record<string, string>>({});

  const decideError = decideRequest.error instanceof ApiRequestError ? decideRequest.error : null;

  const trimmedNote = note.trim();
  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const canApprove =
    canDecide && !decideRequest.isPending && trimmedName.length > 0 && trimmedSlug.length >= 2;
  const canReject = canDecide && !decideRequest.isPending && trimmedNote.length > 0;

  /**
   * Only the listings the moderator actually redirected.
   *
   * An entry per waiting listing would be the same instruction spelled out longhand, and it
   * would also stop meaning "the moderator chose this" — which matters, because the default
   * differs by arm. Absent is the honest way to say "wherever this verdict sends it".
   */
  const productAssignments = Object.entries(productTargets)
    .filter(([, categoryId]) => categoryId !== "")
    .map(([productId, categoryId]) => ({ productId, categoryId }));

  function buildDecideInput(decision: "approve" | "reject"): DecideStoreCategoryRequestInput {
    if (decision === "reject") {
      return {
        decision: "reject",
        note: trimmedNote,
        ...(productAssignments.length === 0 ? {} : { productAssignments }),
      };
    }
    return {
      decision: "approve",
      name: trimmedName,
      slug: trimmedSlug,
      parentCategoryId: parentCategoryId === "" ? null : parentCategoryId,
      ...(trimmedNote === "" ? {} : { note: trimmedNote }),
      ...(productAssignments.length === 0 ? {} : { productAssignments }),
    };
  }

  return (
    <li className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{request.proposedName}</p>
        {request.justification !== null && (
          <p className="text-xs text-muted-foreground">{request.justification}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {request.waitingProducts.length} listing(s) waiting in Misc for this request
        </p>
      </div>

      {decideError && <MutationErrorNotice error={decideError.apiError} />}
      {decideRequest.isSuccess && (
        <MutationSuccessNotice message="Decision recorded. The queue has been refreshed." />
      )}

      {canDecide && (
        <>
          <label className="block space-y-1 text-xs">
            <span className="font-medium">Category name</span>
            <input
              value={name}
              onChange={(changeEvent) => {
                setName(changeEvent.target.value);
                if (!hasEditedSlug) setSlug(toCategorySlug(changeEvent.target.value));
              }}
              maxLength={120}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Slug — permanent</span>
            <input
              value={slug}
              onChange={(changeEvent) => {
                setHasEditedSlug(true);
                setSlug(changeEvent.target.value);
              }}
              maxLength={100}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 font-mono text-sm"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Parent</span>
            <select
              value={parentCategoryId}
              onChange={(changeEvent) => setParentCategoryId(changeEvent.target.value)}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            >
              <option value="">No parent — a top-level category</option>
              {assignableCategories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium">Note</span>
            <textarea
              value={note}
              onChange={(changeEvent) => setNote(changeEvent.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Required to reject. Optional when approving."
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
            />
          </label>

          {/* THE PER-LISTING OVERRIDE. Left alone, every waiting listing follows the
              verdict: into the new category on an approval, staying in Misc on a rejection.
              Pointing one at an existing category is how a moderator says "this one was
              really just a chair" without refusing the request outright — and it is the only
              control that reaches the route's `productAssignments`. */}
          {request.waitingProducts.length > 0 && (
            <fieldset className="space-y-2 rounded-xl border border-[#CAC4D0]/60 p-3 text-xs">
              <legend className="px-1 font-medium">Where each waiting listing goes</legend>
              <ul className="space-y-2">
                {request.waitingProducts.map((waitingProduct) => (
                  <li key={waitingProduct.id} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-40 flex-1 truncate">{waitingProduct.title}</span>
                    <select
                      value={productTargets[waitingProduct.id] ?? ""}
                      onChange={(changeEvent) =>
                        setProductTargets((previousTargets) => ({
                          ...previousTargets,
                          [waitingProduct.id]: changeEvent.target.value,
                        }))
                      }
                      className="rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
                    >
                      <option value="">Follow the decision</option>
                      {assignableCategories.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canApprove}
              onClick={() =>
                decideRequest.mutate({
                  requestId: request.id,
                  input: buildDecideInput("approve"),
                })
              }
              className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={!canReject}
              onClick={() =>
                decideRequest.mutate({
                  requestId: request.id,
                  input: buildDecideInput("reject"),
                })
              }
              className="cursor-pointer rounded-full border border-[#BA1A1A] px-4 py-2 text-xs font-medium text-[#BA1A1A] transition-colors hover:bg-[#BA1A1A]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reject
            </button>
            {trimmedNote === "" && (
              <span className="text-[10px] text-muted-foreground">
                A note is required to reject.
              </span>
            )}
          </div>
        </>
      )}
    </li>
  );
}
