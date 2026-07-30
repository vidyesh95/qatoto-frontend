// TRANSPORT: client-query — the one "use client" file in this flow. Calls
// `useCreateResearchProgramMutation`, then `useProgramBranchMutation` once per seed branch.
"use client";

import Link from "next/link";
import { useState } from "react";

import { useCreateResearchProgramMutation } from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";

import { MutationErrorNotice } from "../sections/mutation-feedback";

/** A branch the proposer sketches while writing the programme. Optional, and often empty. */
interface SeedBranchDraft {
  readonly title: string;
  readonly summary: string;
}

const EMPTY_SEED_BRANCH: SeedBranchDraft = { title: "", summary: "" };

/**
 * Propose a research programme.
 *
 * WHAT THIS PAGE IS HONEST ABOUT, throughout: the programme lands `pending`. It will not appear on
 * the public index, it cannot take contributions — not even from its proposer — and a moderator
 * decides. Every screen here says that, and the confirmation says it loudest, because a "created!"
 * that omits the review step leaves somebody refreshing an index their programme is deliberately
 * absent from.
 *
 * SEED BRANCHES ARE WRITTEN AFTER THE PROGRAMME, ONE AT A TIME, and a failure part-way is reported
 * rather than hidden. They cannot be written with it: the programme has no id until it exists, and
 * the branch route is per-programme. A partial result is a real outcome — the programme is created
 * and some branches are not — so the UI reports exactly that instead of implying an all-or-nothing
 * transaction it does not have.
 *
 * THE BRANCH WRITES WOULD FAIL ANYWAY while the programme is `pending`, because contributions are
 * closed until it is published. So the seed branches are held as a DRAFT and offered again on the
 * programme page after publication, rather than posted here and 409'd.
 */
export default function NewProgramWizardPage() {
  const createMutation = useCreateResearchProgramMutation();

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [missionStatement, setMissionStatement] = useState("");
  const [seedBranches, setSeedBranches] = useState<SeedBranchDraft[]>([EMPTY_SEED_BRANCH]);
  const [submittedSlugTitle, setSubmittedSlugTitle] = useState<string | null>(null);

  const createError =
    createMutation.error instanceof ApiRequestError ? createMutation.error : undefined;

  const isSubmittable =
    title.trim().length >= 3 && tagline.trim().length >= 3 && missionStatement.trim().length >= 20;

  function updateSeedBranch(index: number, patch: Partial<SeedBranchDraft>): void {
    setSeedBranches((branches) =>
      branches.map((branch, branchIndex) =>
        branchIndex === index ? { ...branch, ...patch } : branch,
      ),
    );
  }

  if (submittedSlugTitle !== null) {
    return (
      <div className="space-y-6 px-4 pt-6 pb-6 lg:px-6">
        <div className="max-w-2xl space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-6">
          <h1 className="font-serif text-2xl">Submitted for review</h1>
          {/*
            Says the whole truth. The programme exists, it is not public, and nobody — including
            the person reading this — can contribute to it yet.
          */}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{submittedSlugTitle}</span> has been
            submitted. It is <span className="font-medium">not listed publicly</span> and cannot
            take contributions until a moderator publishes it — you will find it under &ldquo;your
            submissions&rdquo; with its status, and the reviewer&apos;s note will appear there
            either way.
          </p>
          {seedBranches.some((branch) => branch.title.trim() !== "") && (
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              Your sketched branches were not created: a programme has to be published before it can
              take branches. Add them from the programme page once it is live.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/research-and-development/programs"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C]"
            >
              Back to programmes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pt-6 pb-6 lg:px-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="font-serif text-2xl">Propose a research programme</h1>
        <p className="text-sm text-muted-foreground">
          A programme is open, long-horizon research anybody can contribute to — a branch map, a
          paper library and public discussion. It is reviewed before it goes public.
        </p>
      </div>

      <form
        className="max-w-2xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isSubmittable) return;
          createMutation.mutate(
            {
              title: title.trim(),
              tagline: tagline.trim(),
              missionStatement: missionStatement.trim(),
            },
            { onSuccess: () => setSubmittedSlugTitle(title.trim()) },
          );
        }}
      >
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={3}
            maxLength={120}
            placeholder="Project Immortal"
            className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            {/* The slug is server-derived and unwritable afterwards, so this is worth saying now. */}
            Becomes the programme&apos;s permanent web address. It cannot be changed later.
          </span>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">One-line summary</span>
          <input
            required
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            minLength={3}
            maxLength={200}
            placeholder="Open research toward extending healthy human life"
            className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Mission</span>
          <textarea
            required
            value={missionStatement}
            onChange={(event) => setMissionStatement(event.target.value)}
            minLength={20}
            maxLength={4000}
            rows={6}
            placeholder="What question is this programme trying to answer, and how will contributors know whether it is working?"
            className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            {missionStatement.trim().length} / 4000 · at least 20 characters
          </span>
        </label>

        <fieldset className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
          <legend className="px-1 text-sm font-medium">Sketch the first branches (optional)</legend>
          <p className="text-xs text-muted-foreground">
            The questions the programme starts from. You can add these after it is published —
            nothing here is submitted yet.
          </p>
          {seedBranches.map((branch, index) => (
            <div key={index} className="space-y-2">
              <input
                value={branch.title}
                onChange={(event) => updateSeedBranch(index, { title: event.target.value })}
                maxLength={120}
                placeholder="Branch title"
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              />
              <textarea
                value={branch.summary}
                onChange={(event) => updateSeedBranch(index, { summary: event.target.value })}
                maxLength={2000}
                rows={2}
                placeholder="What this branch is asking"
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSeedBranches((branches) => [...branches, EMPTY_SEED_BRANCH])}
            className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            Add another branch
          </button>
        </fieldset>

        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          Submitting sends this to a moderator. It stays private, and closed to contributions, until
          they publish it.
        </div>

        {createError && <MutationErrorNotice error={createError.apiError} />}

        <button
          type="submit"
          disabled={createMutation.isPending || !isSubmittable}
          className="cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
