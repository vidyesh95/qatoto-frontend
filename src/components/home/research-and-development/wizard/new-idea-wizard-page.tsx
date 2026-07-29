// TRANSPORT: client-query — "use client" island. Reads GET /research-categories to
// resolve the category the founder picked, and writes POST /research-projects,
// POST …/:slug/cover and POST …/:slug/publish. Needs QueryProvider, which
// (home)/layout.tsx mounts.
"use client";

import { useState } from "react";

import Link from "next/link";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useCreateResearchProjectMutation,
  useResearchCategoriesQuery,
  type CreateProjectProgress,
} from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";

import IdeaBasicsStep from "@/components/home/research-and-development/wizard/idea-basics-step";
import ProblemAndMarketStep from "@/components/home/research-and-development/wizard/problem-and-market-step";
import ReviewAndSubmitStep from "@/components/home/research-and-development/wizard/review-and-submit-step";
import RolesNeededStep from "@/components/home/research-and-development/wizard/roles-needed-step";
import {
  IDEA_CATEGORIES,
  type NewIdeaDraft,
} from "@/components/home/research-and-development/wizard/wizard-shared";
import { appendOptionNameIfNew } from "@/components/ui/creatable-combobox";

/**
 * Multi-step post-idea wizard.
 *
 * AN IDEA **IS** A PROJECT. There is no separate idea table, so this wizard creates a
 * research project and leaves it a DRAFT — private to its founder, `404` to everyone
 * else — rather than posting an "idea" that later becomes something. Publishing is a
 * separate, deliberate act on the project's own page.
 *
 * THE CATEGORY IS AN ID, NOT A NAME. `research_project.categoryId` is a foreign key and
 * there is no "other" bucket, so a category the founder typed that does not exist is
 * PROPOSED first (`POST /research-categories`, arriving `pending`) and the project links
 * to the id that comes back. The taxonomy is moderated afterwards.
 *
 * EQUITY CROSSES AS INTEGER BASIS POINTS. The percent inputs are converted here; a float
 * never reaches the wire, and an inverted band is refused by the server with a `422`
 * rather than being silently reordered.
 */

const NEW_IDEA_STEPS = [
  { id: "idea-basics", label: "Idea basics" },
  { id: "problem-and-market", label: "Problem & market" },
  { id: "roles-needed", label: "Roles needed" },
  { id: "review-and-submit", label: "Review & submit" },
] as const;

type NewIdeaStepId = (typeof NEW_IDEA_STEPS)[number]["id"];

type NewIdeaWizardViewState =
  | { status: "editing"; currentStepIndex: number }
  | { status: "submitted"; projectSlug: string };

const BASIS_POINTS_PER_PERCENT = 100;

/**
 * Percent string → integer basis points, or undefined when the field is blank.
 *
 * ROUNDED, NEVER TRUNCATED, and an unparseable value becomes `undefined` rather than
 * `0`: sending 0 basis points would advertise "no equity offered", which is a different
 * claim from "the founder did not say".
 */
function toBasisPoints(percentText: string): number | undefined {
  if (percentText.trim() === "") return undefined;
  const percent = Number(percentText);
  if (!Number.isFinite(percent)) return undefined;
  return Math.round(percent * BASIS_POINTS_PER_PERCENT);
}

const EMPTY_NEW_IDEA_DRAFT: NewIdeaDraft = {
  ideaName: "",
  oneLinePitch: "",
  category: "",
  problemItSolves: "",
  targetRegion: "",
  demandEvidenceNotes: "",
  rolesNeeded: [],
  offeredEquityPercentMin: "",
  offeredEquityPercentMax: "",
  expectedCommitment: "part_time",
};

export default function NewIdeaWizardPage() {
  const [viewState, setViewState] = useState<NewIdeaWizardViewState>({
    status: "editing",
    currentStepIndex: 0,
  });
  const [draft, setDraft] = useState<NewIdeaDraft>(EMPTY_NEW_IDEA_DRAFT);
  // Categories the user invented this session. Held here rather than in step 1
  // because that step unmounts on every step change; this page does not, so a
  // created category survives navigating away and back. It does not survive a
  // reload — that needs the backend.
  const [categoryOptions, setCategoryOptions] = useState<string[]>([...IDEA_CATEGORIES]);
  const [createProgress, setCreateProgress] = useState<CreateProjectProgress>({ phase: "idle" });

  // The approved taxonomy. A failed read costs the id lookup, not the wizard: an
  // unmatched label is proposed as a new category, which is the same path a genuinely
  // new one takes.
  const categoriesQuery = useResearchCategoriesQuery();
  const createProjectMutation = useCreateResearchProjectMutation();
  const createError =
    createProjectMutation.error instanceof ApiRequestError
      ? createProjectMutation.error.apiError
      : null;

  const applyDraftPatch = (draftPatch: Partial<NewIdeaDraft>) => {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  };

  const handleCategoryCommit = (committedCategoryName: string) => {
    setCategoryOptions((previousCategoryOptions) =>
      appendOptionNameIfNew(previousCategoryOptions, committedCategoryName),
    );
    applyDraftPatch({ category: committedCategoryName });
  };

  const isDraftValid = draft.ideaName.trim() !== "" && draft.oneLinePitch.trim() !== "";

  const renderCurrentStep = (stepId: NewIdeaStepId) => {
    switch (stepId) {
      case "idea-basics":
        return (
          <IdeaBasicsStep
            draft={draft}
            onDraftChange={applyDraftPatch}
            categoryOptions={categoryOptions}
            onCategoryCommit={handleCategoryCommit}
          />
        );
      case "problem-and-market":
        return <ProblemAndMarketStep draft={draft} onDraftChange={applyDraftPatch} />;
      case "roles-needed":
        return <RolesNeededStep draft={draft} onDraftChange={applyDraftPatch} />;
      case "review-and-submit":
        return <ReviewAndSubmitStep draft={draft} />;
      default: {
        const exhaustiveCheck: never = stepId;
        return exhaustiveCheck;
      }
    }
  };

  switch (viewState.status) {
    case "submitted":
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-[#00696E]/10 text-2xl text-[#00696E]">
            ✓
          </span>
          <p className="text-base font-medium">Saved as a draft</p>
          {/* Says what actually happened. It is not public yet, and nothing is matching
              anybody to it — publishing is the next, separate decision. */}
          <p className="text-sm text-muted-foreground">
            Only you can see it. Open it to add a cover, check the details, and publish when you are
            ready — that is the moment it becomes public.
          </p>
          <Link
            href={`/research-and-development/project/${viewState.projectSlug}`}
            className="mt-2 cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Open your draft
          </Link>
        </div>
      );
    case "editing": {
      const { currentStepIndex } = viewState;
      const currentStep = NEW_IDEA_STEPS[currentStepIndex];
      const isFirstStep = currentStepIndex === 0;
      const isLastStep = currentStepIndex === NEW_IDEA_STEPS.length - 1;

      const handleBackStepClick = () => {
        setViewState({ status: "editing", currentStepIndex: Math.max(0, currentStepIndex - 1) });
      };
      const handleNextStepClick = () => {
        setViewState({
          status: "editing",
          currentStepIndex: Math.min(NEW_IDEA_STEPS.length - 1, currentStepIndex + 1),
        });
      };
      const handleIdeaSubmitClick = () => {
        if (!isDraftValid) return;

        // Match by display label against the APPROVED vocabulary. No match means the
        // founder invented one, which is proposed alongside the project rather than
        // rejected — the whole point of a `pending` category status.
        const matchedCategory = categoriesQuery.data?.find(
          (category) => category.displayLabel === draft.category,
        );

        createProjectMutation.mutate(
          {
            input: {
              name: draft.ideaName,
              tagline: draft.oneLinePitch,
              categoryId: matchedCategory?.id ?? "",
              problemStatement: draft.problemItSolves || undefined,
              targetRegion: draft.targetRegion || undefined,
              demandEvidenceNotes: draft.demandEvidenceNotes || undefined,
              seedRolesNeeded: draft.rolesNeeded.length > 0 ? draft.rolesNeeded : undefined,
              offeredEquityBasisPointsMin: toBasisPoints(draft.offeredEquityPercentMin),
              offeredEquityBasisPointsMax: toBasisPoints(draft.offeredEquityPercentMax),
              expectedCommitment: draft.expectedCommitment,
            },
            newCategoryLabel: matchedCategory === undefined ? draft.category : undefined,
            // The project stays a DRAFT. Publishing is a separate decision, made on the
            // project's own page once the founder has looked at it.
            shouldPublish: false,
            onProgress: setCreateProgress,
          },
          {
            onSuccess: (project) => {
              setViewState({ status: "submitted", projectSlug: project.slug });
            },
          },
        );
      };

      return (
        <div className="mx-auto max-w-xl space-y-6 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
          <header className="space-y-1">
            <h1 className="font-serif text-2xl font-semibold md:text-3xl">Post your idea</h1>
            <p className="text-sm text-muted-foreground">
              Four quick steps — Qatoto lines up the demand data, teammates, and backers.
            </p>
          </header>

          <ol className="flex items-center gap-1.5">
            {NEW_IDEA_STEPS.map((step, stepIndex) => {
              const isStepCompleted = stepIndex < currentStepIndex;
              const isStepCurrent = stepIndex === currentStepIndex;
              return (
                <li key={step.id} className="flex flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewState({ status: "editing", currentStepIndex: stepIndex })}
                    aria-current={isStepCurrent ? "step" : undefined}
                    className={`grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-xs font-semibold transition-colors ${
                      isStepCompleted
                        ? "bg-[#00696E] text-white"
                        : isStepCurrent
                          ? "bg-[#00696E]/10 text-[#00696E] ring-2 ring-[#00696E]"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isStepCompleted ? "✓" : stepIndex + 1}
                  </button>
                  {stepIndex < NEW_IDEA_STEPS.length - 1 && (
                    <span
                      className={`h-0.5 flex-1 rounded-full ${
                        isStepCompleted ? "bg-[#00696E]" : "bg-muted"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <div className="space-y-4">
            <h2 className="text-sm font-medium tracking-wide xl:text-lg">
              Step {currentStepIndex + 1} of {NEW_IDEA_STEPS.length}: {currentStep.label}
            </h2>
            {renderCurrentStep(currentStep.id)}
            {createError !== null && <MutationErrorNotice error={createError} />}
          </div>

          <footer className="flex items-center justify-between border-t border-border/50 pt-4">
            <button
              type="button"
              onClick={handleBackStepClick}
              disabled={isFirstStep}
              className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Back
            </button>
            {isLastStep ? (
              <button
                type="button"
                onClick={handleIdeaSubmitClick}
                disabled={!isDraftValid || createProjectMutation.isPending}
                className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {createProgress.phase === "creating-category"
                  ? "Proposing the category…"
                  : createProgress.phase === "creating-project"
                    ? "Saving your draft…"
                    : "Save as a draft"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextStepClick}
                className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
              >
                Next: {NEW_IDEA_STEPS[currentStepIndex + 1].label}
              </button>
            )}
          </footer>
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
