// TRANSPORT: client-query — reads the public category levels and the caller's own requests
// through `@/hooks/store/categories`, and submits a new request through
// `useSubmitStoreCategoryRequestMutation` in `@/hooks/store/admin-categories`.
"use client";

import { useState } from "react";

import { useSubmitStoreCategoryRequestMutation } from "@/hooks/store/admin-categories";
import {
  useOwnStoreCategoryRequestsQuery,
  useStoreCategoryLevelQuery,
} from "@/hooks/store/categories";
import { ApiRequestError } from "@/lib/http";
import type { StoreCategory } from "@/lib/store/catalog.schemas";

/**
 * What the wizard ends up sending. Exactly one id, never both — the backend's create schema
 * refuses the pair rather than choosing which one the seller meant.
 *
 * `displayLabel` is UI STATE and is never sent. The review step has to name the choice, and
 * the only alternatives were a second lookup or re-deriving a label from an id the wizard
 * does not hold the tree for. It is allowed to be empty while a hydrated edit is still
 * resolving; the id is the part that has to be right.
 */
export type ListingCategoryChoice =
  | {
      kind: "category";
      categoryId: string;
      displayLabel: string;
      /**
       * STORE §20. The public slug, which the attribute read is keyed on.
       *
       * NULL WHILE A HYDRATED EDIT IS STILL RESOLVING, for exactly the reason `displayLabel` is
       * empty there: the product read returns a category ID and nothing else, and inventing a
       * slug from it would be a guess the attribute route would 404. The picker fills it in as
       * soon as the seller touches the control, and the attribute step says so meanwhile.
       */
      categorySlug: string | null;
    }
  | { kind: "request"; categoryRequestId: string; displayLabel: string };

/**
 * Pick the category a listing belongs to, or ask for one that does not exist.
 *
 * IT WALKS THE TREE ONE LEVEL AT A TIME because the backend accepts only an ACTIVE LEAF. A
 * flat list of every category would happily let a seller choose a parent, and they would
 * find out it was refused after filling in the rest of the wizard.
 *
 * THE REQUEST PATH IS NOT A FAILURE PATH. A seller whose category is missing still publishes
 * immediately — the listing goes live in Misc and moves when a moderator decides. That is
 * why this offers the seller's EXISTING pending requests too: five listings in the same
 * not-yet-approved category should be one ask, not five, and five duplicate rows in the
 * queue is a moderator approving one and rejecting four.
 */
export function ListingCategoryPicker({
  value,
  isDisabled,
  onChange,
}: {
  value: ListingCategoryChoice | null;
  isDisabled: boolean;
  onChange: (choice: ListingCategoryChoice | null) => void;
}) {
  const [selectedRootId, setSelectedRootId] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const rootsQuery = useStoreCategoryLevelQuery(null);
  const childrenQuery = useStoreCategoryLevelQuery(
    selectedRootId === "" ? null : selectedRootId,
    selectedRootId !== "",
  );

  const roots: readonly StoreCategory[] = rootsQuery.data ?? [];
  const children: readonly StoreCategory[] =
    selectedRootId === "" ? [] : (childrenQuery.data ?? []);
  const hasChildren = children.length > 0;

  const selectedCategoryId = value?.kind === "category" ? value.categoryId : "";

  function handleRootChange(nextRootId: string) {
    setSelectedRootId(nextRootId);
    // Reported as the choice for now. If this root turns out to HAVE children the sub-select
    // appears and replaces it — and until one is picked the backend would refuse this id as
    // a non-leaf, which is the correct answer rather than a silent acceptance.
    const chosenRoot = roots.find((root) => root.id === nextRootId);
    onChange(
      nextRootId === "" || chosenRoot === undefined
        ? null
        : {
            kind: "category",
            categoryId: nextRootId,
            displayLabel: chosenRoot.name,
            categorySlug: chosenRoot.slug,
          },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Category</span>
        <select
          value={selectedRootId}
          disabled={isDisabled || rootsQuery.isPending}
          onChange={(changeEvent) => handleRootChange(changeEvent.target.value)}
          className="h-12 w-full cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
        >
          <option value="">
            {rootsQuery.isPending ? "Loading categories…" : "Select a category"}
          </option>
          {roots.map((rootCategory) => (
            <option key={rootCategory.id} value={rootCategory.id}>
              {rootCategory.name}
            </option>
          ))}
        </select>
      </label>

      {rootsQuery.isError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800"
        >
          Couldn&apos;t load the categories. Reload the page and try again.
        </p>
      )}

      {/* The second level appears only when there IS one. A permanently-rendered empty
          select would read as a required field with nothing in it. */}
      {hasChildren && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Sub-category</span>
          <select
            value={selectedCategoryId === selectedRootId ? "" : selectedCategoryId}
            disabled={isDisabled}
            onChange={(changeEvent) => {
              const chosenChild = children.find((child) => child.id === changeEvent.target.value);
              onChange(
                chosenChild === undefined
                  ? null
                  : {
                      kind: "category",
                      categoryId: chosenChild.id,
                      displayLabel: chosenChild.name,
                      categorySlug: chosenChild.slug,
                    },
              );
            }}
            className="h-12 w-full cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
          >
            <option value="">Select a sub-category</option>
            {children.map((childCategory) => (
              <option key={childCategory.id} value={childCategory.id}>
                {childCategory.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {roots.find((root) => root.id === selectedRootId)?.name} has sub-categories, so a
            listing goes in one of them.
          </span>
        </label>
      )}

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setIsRequesting((wasRequesting) => !wasRequesting)}
        className="cursor-pointer self-start text-xs text-[#00696E] underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRequesting ? "Never mind — pick an existing category" : "My category isn't listed"}
      </button>

      {isRequesting && (
        <CategoryRequestPanel
          isDisabled={isDisabled}
          roots={roots}
          selectedRequestId={value?.kind === "request" ? value.categoryRequestId : ""}
          onRequestChosen={(categoryRequestId, proposedName) => {
            onChange({
              kind: "request",
              categoryRequestId,
              displayLabel: `${proposedName} (awaiting review)`,
            });
          }}
        />
      )}

      {value?.kind === "request" && (
        <p className="rounded-lg border border-[#CAC4D0]/60 bg-muted/40 p-2 text-xs text-muted-foreground">
          This listing will publish under <strong>Misc</strong> and move into the new category once
          a moderator approves your request. It stays visible and buyable the whole time.
        </p>
      )}
    </div>
  );
}

/**
 * Ask for a category, or attach this listing to an ask already in the queue.
 *
 * THE EXISTING-REQUEST LIST COMES FIRST because reusing one is the better answer whenever it
 * applies, and a form shown above it invites a duplicate.
 */
function CategoryRequestPanel({
  isDisabled,
  roots,
  selectedRequestId,
  onRequestChosen,
}: {
  isDisabled: boolean;
  roots: readonly StoreCategory[];
  selectedRequestId: string;
  onRequestChosen: (categoryRequestId: string, proposedName: string) => void;
}) {
  const ownRequestsQuery = useOwnStoreCategoryRequestsQuery(true);
  const submitRequest = useSubmitStoreCategoryRequestMutation();

  const [proposedName, setProposedName] = useState("");
  const [proposedParentCategoryId, setProposedParentCategoryId] = useState("");
  const [justification, setJustification] = useState("");

  const pendingRequests = (ownRequestsQuery.data ?? []).filter(
    (request) => request.state === "pending",
  );
  const submitError = submitRequest.error instanceof ApiRequestError ? submitRequest.error : null;
  const trimmedName = proposedName.trim();
  const canSubmit = !isDisabled && !submitRequest.isPending && trimmedName.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#CAC4D0]/60 p-3">
      {pendingRequests.length > 0 && (
        <label className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium">Use a request you already made</span>
          <select
            value={selectedRequestId}
            disabled={isDisabled}
            onChange={(changeEvent) => {
              const chosenRequest = pendingRequests.find(
                (request) => request.id === changeEvent.target.value,
              );
              if (chosenRequest !== undefined) {
                onRequestChosen(chosenRequest.id, chosenRequest.proposedName);
              }
            }}
            className="h-10 w-full cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm"
          >
            <option value="">Select one of your pending requests</option>
            {pendingRequests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.proposedName}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-xs">
        <span className="font-medium">Category you need</span>
        <input
          value={proposedName}
          disabled={isDisabled}
          onChange={(changeEvent) => setProposedName(changeEvent.target.value)}
          maxLength={120}
          placeholder="Solar cold storage"
          className="h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs">
        <span className="font-medium">Where it belongs (optional)</span>
        <select
          value={proposedParentCategoryId}
          disabled={isDisabled}
          onChange={(changeEvent) => setProposedParentCategoryId(changeEvent.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm"
        >
          <option value="">A new top-level category</option>
          {roots.map((rootCategory) => (
            <option key={rootCategory.id} value={rootCategory.id}>
              Under {rootCategory.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-xs">
        <span className="font-medium">Why (optional, helps it get approved)</span>
        <textarea
          value={justification}
          disabled={isDisabled}
          onChange={(changeEvent) => setJustification(changeEvent.target.value)}
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        />
      </label>

      {submitError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800"
        >
          {submitError.apiError.message}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          submitRequest.mutate(
            {
              proposedName: trimmedName,
              proposedParentCategoryId:
                proposedParentCategoryId === "" ? null : proposedParentCategoryId,
              justification: justification.trim() === "" ? null : justification.trim(),
            },
            {
              // The listing is attached to the request the server actually created, using
              // the id it returned. Nothing here is optimistic: a request that failed must
              // not leave the wizard holding an id that names no row.
              onSuccess: (result) => {
                onRequestChosen(result.request.id, result.request.proposedName);
                setProposedName("");
                setProposedParentCategoryId("");
                setJustification("");
              },
            },
          );
        }}
        className="cursor-pointer self-start rounded-full bg-[#00696E] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitRequest.isPending ? "Requesting…" : "Request this category"}
      </button>
    </div>
  );
}
