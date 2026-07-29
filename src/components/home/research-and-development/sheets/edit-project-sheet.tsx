// TRANSPORT: client-query — "use client" island calling useProjectSettingsMutation.
// Writes PATCH /research-projects/:slug, POST …/cover, POST …/publish · /unpublish and
// POST …/stage.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import RndSheet from "@/components/home/research-and-development/sheets/rnd-sheet";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useProjectSettingsMutation } from "@/hooks/rnd/projects";
import { ApiRequestError } from "@/lib/http";
import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";
import type { ResearchProjectDetail } from "@/lib/rnd/projects.schemas";
import { PROJECT_STAGES, ProjectStageSchema, type ProjectStage } from "@/lib/rnd/shared.schemas";

/** Founder and maintainer edit; only the founder publishes or moves the stage. */
const EDIT_ROLES = ["founder", "admin", "maintainer"];

function canEdit(viewerProjectRole: string | null): boolean {
  return viewerProjectRole !== null && EDIT_ROLES.includes(viewerProjectRole);
}

function isFounder(viewerProjectRole: string | null): boolean {
  return viewerProjectRole === "founder";
}

/**
 * Edit the project, change its cover, publish it, move its stage.
 *
 * **IT IS NO LONGER SHOWN TO EVERY VISITOR.** The old version rendered for anyone and saved
 * nothing — a stranger could open an edit form for someone else's project, fill it in, and
 * watch it "save". It is now gated on `viewerProjectRole`, with the server's own `404` as
 * the real check.
 *
 * FOUR SEPARATE WRITES, NOT ONE FORM SUBMIT, because they are four different acts:
 *
 * - **Details** are a `PATCH`.
 * - **The cover** is multipart and its own request.
 * - **Publish** is the moment the project stops answering `404` to everyone but its
 *   founder. It is deliberately not a checkbox inside the details form.
 * - **Stage** has its own route because every change writes an append-only audit row. A
 *   stage buried in a PATCH body would let the pipeline move with nobody recorded as
 *   having moved it — which is why the note field beside it matters.
 */
export default function EditProjectSheet({ project }: { project: ResearchProjectDetail }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [draftName, setDraftName] = useState(project.name);
  const [draftTagline, setDraftTagline] = useState(project.tagline);
  // `description` is nullable on the wire; a controlled textarea needs a string.
  const [draftDescription, setDraftDescription] = useState(project.description ?? "");
  const [draftStage, setDraftStage] = useState<ProjectStage>(project.stage);
  const [stageNote, setStageNote] = useState("");

  const settingsMutation = useProjectSettingsMutation(project.slug);
  const settingsError =
    settingsMutation.error instanceof ApiRequestError ? settingsMutation.error.apiError : null;

  if (!canEdit(project.viewerProjectRole)) return null;

  const isDraft = project.publishedAt === null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
      >
        Edit project
      </button>

      <RndSheet
        title="Edit project"
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          settingsMutation.reset();
        }}
      >
        <div className="flex flex-col gap-6 px-4 pb-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              settingsMutation.mutate({
                action: "update",
                input: {
                  name: draftName.trim(),
                  tagline: draftTagline.trim(),
                  description: draftDescription.trim() || undefined,
                },
              });
            }}
          >
            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>Name</span>
              <input
                type="text"
                value={draftName}
                onChange={(changeEvent) => setDraftName(changeEvent.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>Tagline</span>
              <input
                type="text"
                value={draftTagline}
                onChange={(changeEvent) => setDraftTagline(changeEvent.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL_CLASS}>Description</span>
              <textarea
                value={draftDescription}
                onChange={(changeEvent) => setDraftDescription(changeEvent.target.value)}
                rows={4}
                className={INPUT_CLASS}
              />
            </label>

            <button
              type="submit"
              disabled={settingsMutation.isPending}
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Save details
            </button>
          </form>

          <label className="flex flex-col gap-1 border-t border-[#CAC4D0]/40 pt-4">
            <span className={LABEL_CLASS}>Cover image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(changeEvent) => {
                const coverFile = changeEvent.target.files?.[0];
                if (coverFile) settingsMutation.mutate({ action: "cover", coverFile });
              }}
              className="text-sm"
            />
          </label>

          {isFounder(project.viewerProjectRole) && (
            <>
              <form
                className="flex flex-col gap-2 border-t border-[#CAC4D0]/40 pt-4"
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  settingsMutation.mutate({
                    action: "stage",
                    stage: draftStage,
                    stageNote: stageNote.trim() || undefined,
                  });
                }}
              >
                <label className="flex flex-col gap-1">
                  <span className={LABEL_CLASS}>Pipeline stage</span>
                  <select
                    value={draftStage}
                    onChange={(changeEvent) => {
                      const parsed = ProjectStageSchema.safeParse(changeEvent.target.value);
                      if (parsed.success) setDraftStage(parsed.data);
                    }}
                    className={INPUT_CLASS}
                  >
                    {PROJECT_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {PROJECT_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  type="text"
                  value={stageNote}
                  onChange={(changeEvent) => setStageNote(changeEvent.target.value)}
                  placeholder="Why is it moving? (optional)"
                  className={INPUT_CLASS}
                />
                {/* Said out loud, because it is why this is not a dropdown that
                    auto-saves: the move is recorded against the person making it. */}
                <span className="text-xs text-muted-foreground">
                  A stage change is recorded in the project&apos;s audit trail with your name on it.
                  It cannot be edited afterwards, only followed by another change.
                </span>
                <button
                  type="submit"
                  disabled={settingsMutation.isPending || draftStage === project.stage}
                  className="self-start rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E] disabled:opacity-40"
                >
                  Move the stage
                </button>
              </form>

              <div className="flex flex-col gap-2 border-t border-[#CAC4D0]/40 pt-4">
                <span className={LABEL_CLASS}>Visibility</span>
                <p className="text-xs text-muted-foreground">
                  {isDraft
                    ? "This is a draft. Nobody but you can open it — everyone else gets the same answer they would for a project that does not exist."
                    : "This project is public. Unpublishing hides it again; it does not delete anything."}
                </p>
                <button
                  type="button"
                  disabled={settingsMutation.isPending}
                  onClick={() =>
                    settingsMutation.mutate({ action: isDraft ? "publish" : "unpublish" })
                  }
                  className="self-start rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {isDraft ? "Publish it" : "Unpublish it"}
                </button>
              </div>
            </>
          )}

          {settingsError !== null && <MutationErrorNotice error={settingsError} />}
          {settingsMutation.isSuccess && <p className="text-sm text-[#00696E]">Saved.</p>}
        </div>
      </RndSheet>
    </>
  );
}
