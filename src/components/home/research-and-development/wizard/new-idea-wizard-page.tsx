"use client";

import { useState } from "react";

import Link from "next/link";

import IdeaBasicsStep from "@/components/home/research-and-development/wizard/idea-basics-step";
import ProblemAndMarketStep from "@/components/home/research-and-development/wizard/problem-and-market-step";
import ReviewAndSubmitStep from "@/components/home/research-and-development/wizard/review-and-submit-step";
import RolesNeededStep from "@/components/home/research-and-development/wizard/roles-needed-step";
import {
  IDEA_CATEGORIES,
  type NewIdeaDraft,
} from "@/components/home/research-and-development/wizard/wizard-shared";
import { appendOptionNameIfNew } from "@/components/ui/creatable-combobox";

// Multi-step post-idea wizard (§11) — the promoted form of the post-idea
// sheet. Mock phase: submitting shows a confirmation only; nothing is
// persisted and no card is appended to the featured rail. The real submission
// goes to the Express backend later.

const NEW_IDEA_STEPS = [
  { id: "idea-basics", label: "Idea basics" },
  { id: "problem-and-market", label: "Problem & market" },
  { id: "roles-needed", label: "Roles needed" },
  { id: "review-and-submit", label: "Review & submit" },
] as const;

type NewIdeaStepId = (typeof NEW_IDEA_STEPS)[number]["id"];

type NewIdeaWizardViewState =
  | { status: "editing"; currentStepIndex: number }
  | { status: "submitted" };

const EMPTY_NEW_IDEA_DRAFT: NewIdeaDraft = {
  ideaName: "",
  oneLinePitch: "",
  category: "",
  problemItSolves: "",
  targetRegion: "",
  demandEvidenceNotes: "",
  rolesNeeded: [],
  equityToOffer: "",
  expectedCommitment: "part-time",
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
          <p className="text-base font-medium">Idea posted — team matching begins</p>
          <p className="text-sm text-muted-foreground">
            We&apos;ll surface people trading skills for equity who fit your roles.
          </p>
          <Link
            href="/research-and-development"
            className="mt-2 cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Back to R&D
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
        if (isDraftValid) setViewState({ status: "submitted" });
      };

      return (
        <div className="mx-auto max-w-xl space-y-6 px-4 pt-2 pb-8 lg:px-6">
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
                disabled={!isDraftValid}
                className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Post idea
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
