// TRANSPORT: client-query — calls `useProgramBranchMutation` in
// `@/hooks/rnd/research-programs` to create a branch inline. The tree it picks from arrives as
// props from the page's server fetch.
"use client";

import { useState, type KeyboardEvent } from "react";

import { useRouter } from "next/navigation";

import CreatableCombobox, { type ComboboxOption } from "@/components/ui/creatable-combobox";
import { useProgramBranchMutation } from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import type { ResearchBranch } from "@/lib/rnd/research-programs.schemas";

import { MutationErrorNotice } from "./mutation-feedback";

// Mirrors `CreateBranchSchema` on the backend. These are UX bounds only — the backend re-validates
// every one of them and is the authority. Duplicating them here is what turns a 422 round trip
// into an instantly disabled button.
const BRANCH_TITLE_MIN_LENGTH = 3;
const BRANCH_TITLE_MAX_LENGTH = 120;
const BRANCH_SUMMARY_MIN_LENGTH = 10;
const BRANCH_SUMMARY_MAX_LENGTH = 2000;

/** A branch created in this session. Held locally because `POST /branches` answers with
 *  `{ branchId }` alone and the tree itself is a server-fetched prop — so until `router.refresh()`
 *  lands, this is the only place the new branch exists on the client. `depth` is not invented: it
 *  follows from the parent this component just sent. */
type CreatedBranch = { branchId: string; title: string; depth: number };

// Nothing is created when the combobox's create row is picked — `drafting` is a form, not a
// pending write. The mutation owns `isPending` and `error`, so mirroring them into a variant here
// would be exactly the "loader and error at once" bug the union exists to prevent.
type BranchDraftState =
  | { status: "idle" }
  | { status: "drafting"; title: string; summary: string; parentBranchId: string };

type BranchPickerFieldProps = {
  programSlug: string;
  /** The whole tree, depth-first (the backend orders by `ancestorPath`). */
  branches: ResearchBranch[];
  /** "" means no branch — see `noBranchOptionLabel`. */
  selectedBranchId: string;
  onBranchSelect: (selectedBranchId: string) => void;
  labelText: string;
  /** What "" is called on this surface: "Programme-wide" on a discussion, "Not branch-specific"
   *  on an effort log. Rendered as a real, pickable row so the empty state has a name. */
  noBranchOptionLabel: string;
  helpText?: string;
  /** `published && signed in` — the backend's own precondition for `POST /branches`. False hides
   *  the create row rather than offering a button that 403s. */
  canCreateBranch: boolean;
};

/**
 * ONE BRANCH PICKER FOR EVERY SURFACE THAT FILES SOMETHING AGAINST A BRANCH — the discussion
 * composer and the effort log, which had the same flat `<select>` copied twice.
 *
 * IT IS ID-KEYED, AND THAT IS NOT A DETAIL. `research_program_branch` has no unique index on
 * `title`: two branches may share wording, and create never 409s on a duplicate — the nightly
 * `recompute-branch-signals` job flags near-duplicates after the fact by raising
 * `overlappingGroupCount`. A picker that resolved by name would therefore silently file against
 * the wrong branch on exactly the programmes where branches are being duplicated.
 *
 * MATCHING IS CLIENT-SIDE BECAUSE THE BACKEND OFFERS NOTHING ELSE. `GET /branches` parses no query
 * schema at all — no `q`, no pagination — and returns the whole tree (capped at 500 nodes) in one
 * read. There is no endpoint to debounce against, so ranking the array already in memory is not a
 * shortcut, it is the whole contract.
 *
 * CREATING IS A FORM, NOT A CLICK. `summary` is required and min-10 in both zod and a Postgres
 * CHECK, so a title-only create is a 422 — and deriving a summary from the title would be
 * inventing the one field that explains what the branch is for.
 */
export default function BranchPickerField({
  programSlug,
  branches,
  selectedBranchId,
  onBranchSelect,
  labelText,
  noBranchOptionLabel,
  helpText,
  canCreateBranch,
}: BranchPickerFieldProps) {
  const router = useRouter();
  const branchMutation = useProgramBranchMutation(programSlug);

  const [draftState, setDraftState] = useState<BranchDraftState>({ status: "idle" });
  const [createdBranches, setCreatedBranches] = useState<CreatedBranch[]>([]);

  // Drops each locally-held branch as soon as the refreshed tree carries it, so an entry cannot
  // appear twice while the refresh is in flight.
  const pendingCreatedBranches = createdBranches.filter(
    (createdBranch) => !branches.some((branch) => branch.branchId === createdBranch.branchId),
  );

  const selectableBranches: CreatedBranch[] = [
    ...branches.map((branch) => ({
      branchId: branch.branchId,
      title: branch.title,
      depth: branch.depth,
    })),
    ...pendingCreatedBranches,
  ];

  const comboboxOptions: ComboboxOption[] = [
    { optionId: "", optionName: noBranchOptionLabel },
    ...selectableBranches.map((branch) => ({
      optionId: branch.branchId,
      optionName: branch.title,
    })),
  ];

  const mutationError =
    branchMutation.error instanceof ApiRequestError ? branchMutation.error : undefined;

  function handleCreateRequest(typedBranchTitle: string): void {
    branchMutation.reset();
    setDraftState({ status: "drafting", title: typedBranchTitle, summary: "", parentBranchId: "" });
  }

  function updateDraft(changes: { title?: string; summary?: string; parentBranchId?: string }) {
    setDraftState((previousState) =>
      previousState.status === "drafting" ? { ...previousState, ...changes } : previousState,
    );
  }

  function submitDraft(draft: Extract<BranchDraftState, { status: "drafting" }>): void {
    const trimmedTitle = draft.title.trim();
    const parentBranchId = draft.parentBranchId === "" ? null : draft.parentBranchId;
    const parentDepth =
      parentBranchId === null
        ? null
        : (selectableBranches.find((branch) => branch.branchId === parentBranchId)?.depth ?? null);

    branchMutation.mutate(
      {
        action: "create",
        title: trimmedTitle,
        summary: draft.summary.trim(),
        parentBranchId,
      },
      {
        onSuccess: ({ branchId }) => {
          setCreatedBranches((previousCreatedBranches) => [
            ...previousCreatedBranches,
            { branchId, title: trimmedTitle, depth: parentDepth === null ? 0 : parentDepth + 1 },
          ]);
          onBranchSelect(branchId);
          setDraftState({ status: "idle" });
          // The branch is live the instant it is created, so the branch map, the branch count and
          // the tree this field reads are all stale until the server components re-run.
          router.refresh();
        },
      },
    );
  }

  // Nothing to pick and nothing to create — render no field at all rather than an empty one.
  if (branches.length === 0 && !canCreateBranch) return null;

  return (
    <div className="space-y-2">
      <CreatableCombobox
        labelText={labelText}
        placeholderText="Search branches…"
        selectedOptionId={selectedBranchId}
        options={comboboxOptions}
        onOptionSelect={onBranchSelect}
        {...(canCreateBranch ? { onCreateRequest: handleCreateRequest } : {})}
        {...(helpText === undefined ? {} : { helpText })}
      />

      {draftState.status === "drafting" && (
        <BranchDraftPanel
          draft={draftState}
          parentBranchChoices={selectableBranches}
          isSubmitting={branchMutation.isPending}
          onDraftChange={updateDraft}
          onSubmit={() => submitDraft(draftState)}
          onCancel={() => {
            branchMutation.reset();
            setDraftState({ status: "idle" });
          }}
        />
      )}

      {mutationError && <MutationErrorNotice error={mutationError.apiError} />}
    </div>
  );
}

function isDraftReadyToSubmit(draft: Extract<BranchDraftState, { status: "drafting" }>): boolean {
  return (
    draft.title.trim().length >= BRANCH_TITLE_MIN_LENGTH &&
    draft.summary.trim().length >= BRANCH_SUMMARY_MIN_LENGTH
  );
}

/**
 * The inline create form.
 *
 * IT IS A `div`, NOT A `form`, AND EVERY CONTROL IS `type="button"`. Both call sites render this
 * picker inside their own `<form>`, and nested forms are invalid HTML — the browser drops the
 * inner one, after which "Create branch" would submit the composer instead. The Enter key is
 * intercepted here for the same reason.
 */
function BranchDraftPanel({
  draft,
  parentBranchChoices,
  isSubmitting,
  onDraftChange,
  onSubmit,
  onCancel,
}: {
  draft: Extract<BranchDraftState, { status: "drafting" }>;
  parentBranchChoices: CreatedBranch[];
  isSubmitting: boolean;
  onDraftChange: (changes: { title?: string; summary?: string; parentBranchId?: string }) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const isReadyToSubmit = isDraftReadyToSubmit(draft);
  const remainingSummaryCharacters = BRANCH_SUMMARY_MIN_LENGTH - draft.summary.trim().length;

  function handlePanelKeyDown(keyDownEvent: KeyboardEvent<HTMLDivElement>): void {
    if (keyDownEvent.key !== "Enter") return;
    // The summary is prose and keeps its newlines.
    if (keyDownEvent.target instanceof HTMLTextAreaElement) return;
    // Without this, Enter reaches the enclosing composer's form and posts it.
    keyDownEvent.preventDefault();
    if (isReadyToSubmit && !isSubmitting) onSubmit();
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions -- the handler exists to STOP a key reaching the outer form, not to make this div operable; every control inside is natively focusable
    <div
      onKeyDown={handlePanelKeyDown}
      className="space-y-3 rounded-xl border border-[#CAC4D0]/60 bg-muted/30 p-3 text-xs"
    >
      <p className="font-medium">New branch</p>

      <label className="block space-y-1">
        <span className="font-medium">Title</span>
        <input
          type="text"
          value={draft.title}
          onChange={(changeEvent) => onDraftChange({ title: changeEvent.target.value })}
          minLength={BRANCH_TITLE_MIN_LENGTH}
          maxLength={BRANCH_TITLE_MAX_LENGTH}
          placeholder="What is this line of work called?"
          className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="font-medium">Summary</span>
        <textarea
          value={draft.summary}
          onChange={(changeEvent) => onDraftChange({ summary: changeEvent.target.value })}
          minLength={BRANCH_SUMMARY_MIN_LENGTH}
          maxLength={BRANCH_SUMMARY_MAX_LENGTH}
          rows={2}
          placeholder="What question does this branch answer, and how would you know it worked?"
          className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
        />
        <span className="text-[10px] text-muted-foreground">
          {remainingSummaryCharacters > 0
            ? `${remainingSummaryCharacters} more character${remainingSummaryCharacters === 1 ? "" : "s"} needed.`
            : `${draft.summary.trim().length} / ${BRANCH_SUMMARY_MAX_LENGTH}`}
        </span>
      </label>

      <label className="block space-y-1">
        <span className="font-medium">Parent branch</span>
        <select
          value={draft.parentBranchId}
          onChange={(changeEvent) => onDraftChange({ parentBranchId: changeEvent.target.value })}
          className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
        >
          <option value="">Top level</option>
          {parentBranchChoices.map((branch) => (
            <option key={branch.branchId} value={branch.branchId}>
              {/* The tree already arrives depth-first, so indenting by `depth` alone reproduces
                  its shape without re-deriving it. */}
              {`${"— ".repeat(branch.depth)}${branch.title}`}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isReadyToSubmit || isSubmitting}
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating…" : "Create branch"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="cursor-pointer rounded-full px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        The branch goes live immediately. Its status and overlap flags are computed nightly, so it
        reads as <span className="font-medium">emerging</span> on the map until then.
      </p>
    </div>
  );
}
