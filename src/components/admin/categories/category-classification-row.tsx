// TRANSPORT: client-query — one approved category's domain and parent, saved through
// `useClassifyResearchCategoryMutation`. Each row owns its own mutation, so one row's refusal
// never shows on another.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useClassifyResearchCategoryMutation } from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import type { ResearchCategory } from "@/lib/rnd/catalog.schemas";
import { RESEARCH_CATEGORY_DOMAIN_LABELS } from "@/lib/rnd/labels";
import {
  RESEARCH_CATEGORY_DOMAINS,
  ResearchCategoryDomainSchema,
  type ResearchCategoryDomain,
} from "@/lib/rnd/shared.schemas";

type ClassificationSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "refused"; error: ApiRequestError }
  | { status: "failed" };

/**
 * One row of the "Domain & nesting" list.
 *
 * THE FORM STARTS FROM THE ROW IT WAS GIVEN AND NOTHING ELSE. The request replaces both fields,
 * so a stale starting point would un-nest or re-file a category another moderator changed a
 * moment ago. The parent keys this component on the row's current values, so a saved change
 * refetches and remounts it rather than being mirrored into state by an effect.
 *
 * THE PARENT PICKER NARROWS, IT DOES NOT DECIDE. It offers approved top-level categories other
 * than this one whose domain does not contradict the selected one; the backend holds the same
 * rules under row locks and answers `422` with a reason when a race or a stale list slips past.
 * The current parent is always offered, even when it no longer fits, so the select never shows a
 * value it has no option for.
 */
export default function CategoryClassificationRow({
  category,
  topLevelCategories,
  hasNestedChildren,
  canClassify,
}: {
  category: ResearchCategory;
  topLevelCategories: readonly ResearchCategory[];
  hasNestedChildren: boolean;
  canClassify: boolean;
}) {
  const classifyMutation = useClassifyResearchCategoryMutation();
  const [selectedDomain, setSelectedDomain] = useState<ResearchCategoryDomain | null>(
    category.domain,
  );
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    category.parentCategoryId,
  );

  const hasChanges =
    selectedDomain !== category.domain || selectedParentId !== category.parentCategoryId;

  const parentOptions = topLevelCategories.filter(
    (candidate) =>
      candidate.id === category.parentCategoryId ||
      (candidate.id !== category.id &&
        (candidate.domain === null ||
          selectedDomain === null ||
          candidate.domain === selectedDomain)),
  );
  const parentLabelById = new Map(
    topLevelCategories.map((candidate) => [candidate.id, candidate.displayLabel]),
  );

  const saveState: ClassificationSaveState = classifyMutation.isPending
    ? { status: "saving" }
    : classifyMutation.error instanceof ApiRequestError
      ? { status: "refused", error: classifyMutation.error }
      : classifyMutation.isError
        ? { status: "failed" }
        : { status: "idle" };

  function renderSaveState() {
    switch (saveState.status) {
      case "idle":
        return null;
      case "saving":
        return <span className="text-xs text-muted-foreground">Saving…</span>;
      case "refused":
        return <MutationErrorNotice error={saveState.error.apiError} />;
      case "failed":
        return (
          <p role="alert" className="text-xs text-destructive">
            Couldn&apos;t reach the server. Nothing was saved.
          </p>
        );
      default: {
        const exhaustiveCheck: never = saveState;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <li className="space-y-3 rounded-2xl border border-outline-variant/60 bg-card p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{category.displayLabel}</p>
        <p className="font-mono text-xs text-muted-foreground">{category.slug}</p>
      </div>

      {canClassify ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs">
              <span className="font-medium">Domain</span>
              <select
                value={selectedDomain ?? ""}
                disabled={classifyMutation.isPending}
                onChange={(changeEvent) => {
                  // Parsed, not asserted. "Unassigned" carries "", which fails the enum and
                  // correctly becomes null.
                  const parsedDomain = ResearchCategoryDomainSchema.safeParse(
                    changeEvent.target.value,
                  );
                  setSelectedDomain(parsedDomain.success ? parsedDomain.data : null);
                }}
                className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {RESEARCH_CATEGORY_DOMAINS.map((domain) => (
                  <option key={domain} value={domain}>
                    {RESEARCH_CATEGORY_DOMAIN_LABELS[domain]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-xs">
              <span className="font-medium">Nested under</span>
              <select
                value={selectedParentId ?? ""}
                // A category with children cannot itself be nested; the tree is one level deep.
                disabled={classifyMutation.isPending || hasNestedChildren}
                onChange={(changeEvent) =>
                  setSelectedParentId(
                    changeEvent.target.value === "" ? null : changeEvent.target.value,
                  )
                }
                className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
              >
                <option value="">Top level</option>
                {parentOptions.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.displayLabel}
                  </option>
                ))}
              </select>
              {hasNestedChildren && (
                <span className="block text-muted-foreground">
                  Other categories are nested under this one, so it stays top level.
                </span>
              )}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!hasChanges || classifyMutation.isPending}
              onClick={() =>
                classifyMutation.mutate({
                  categoryId: category.id,
                  input: { domain: selectedDomain, parentCategoryId: selectedParentId },
                })
              }
              className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-xs font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
            {renderSaveState()}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {category.domain === null
            ? "No domain"
            : RESEARCH_CATEGORY_DOMAIN_LABELS[category.domain]}
          {category.parentCategoryId !== null &&
            ` · nested under ${parentLabelById.get(category.parentCategoryId) ?? category.parentCategoryId}`}
        </p>
      )}
    </li>
  );
}
