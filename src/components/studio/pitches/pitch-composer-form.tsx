"use client";

import { useRouter } from "next/navigation";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";

export function PitchComposerForm({
  isEditing,
  projectSlug,
  onProjectSlugChange,
  projects,
  pitchVideoId,
  pitchVideoTitle,
  onOpenVideoPicker,
  onRemoveVideo,
  title,
  onTitleChange,
  summary,
  onSummaryChange,
  fundingUrl,
  onFundingUrlChange,
  contactUrl,
  onContactUrlChange,
  isSaveDisabled,
  isSaving,
  error,
  onSubmit,
}: {
  readonly isEditing: boolean;
  readonly projectSlug: string;
  readonly onProjectSlugChange: (value: string) => void;
  readonly projects: readonly { readonly slug: string; readonly name: string }[];
  readonly pitchVideoId: string | null;
  readonly pitchVideoTitle: string | null;
  readonly onOpenVideoPicker: () => void;
  readonly onRemoveVideo: () => void;
  readonly title: string;
  readonly onTitleChange: (value: string) => void;
  readonly summary: string;
  readonly onSummaryChange: (value: string) => void;
  readonly fundingUrl: string;
  readonly onFundingUrlChange: (value: string) => void;
  readonly contactUrl: string;
  readonly onContactUrlChange: (value: string) => void;
  readonly isSaveDisabled: boolean;
  readonly isSaving: boolean;
  readonly error: Error | null;
  readonly onSubmit: (event: React.FormEvent) => void;
}) {
  const router = useRouter();

  return (
    <form className="mt-6 flex max-w-2xl flex-col gap-4" onSubmit={onSubmit}>
      {!isEditing && (
        <div>
          <label className={LABEL_CLASS} htmlFor="pitch-project">
            Venture
          </label>
          <select
            id="pitch-project"
            className={INPUT_CLASS}
            value={projectSlug}
            onChange={(changeEvent) => onProjectSlugChange(changeEvent.target.value)}
          >
            <option value="">Choose a venture…</option>
            {projects.map((project) => (
              <option key={project.slug} value={project.slug}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Only ventures you founded and published can carry a pitch.
          </p>
        </div>
      )}

      <div>
        <span className={LABEL_CLASS}>Pitch video</span>
        {pitchVideoId === null ? (
          <>
            <button
              type="button"
              disabled={projectSlug.length === 0}
              onClick={onOpenVideoPicker}
              className="mt-1 block cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-foreground disabled:opacity-40"
            >
              Choose a video
            </button>
            <p className="mt-1 text-xs text-muted-foreground">
              {projectSlug.length === 0
                ? "Choose a venture first — a pitch shows a video that belongs to it."
                : "Optional, but a pitch without a video is much weaker. Funders watch before they read."}
            </p>
          </>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-foreground">{pitchVideoTitle ?? "Video chosen"}</span>
            <button
              type="button"
              onClick={onOpenVideoPicker}
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs text-foreground"
            >
              Change
            </button>
            <button
              type="button"
              onClick={onRemoveVideo}
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="pitch-title">
          Title
        </label>
        <input
          id="pitch-title"
          className={INPUT_CLASS}
          value={title}
          maxLength={120}
          onChange={(changeEvent) => onTitleChange(changeEvent.target.value)}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="pitch-summary">
          Summary
        </label>
        <textarea
          id="pitch-summary"
          className={INPUT_CLASS}
          rows={6}
          value={summary}
          maxLength={2000}
          onChange={(changeEvent) => onSummaryChange(changeEvent.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          What you are building and why it is worth funding. 20–2000 characters.
        </p>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="pitch-funding-url">
          Funding link
        </label>
        <input
          id="pitch-funding-url"
          className={INPUT_CLASS}
          value={fundingUrl}
          placeholder="https://…"
          onChange={(changeEvent) => onFundingUrlChange(changeEvent.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Where people actually fund you — your Kickstarter, Wefunder, Ketto or payment page. Qatoto
          takes no money and holds none; this link is the whole mechanism. Must start with https://.
        </p>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="pitch-contact-url">
          Contact link
        </label>
        <input
          id="pitch-contact-url"
          className={INPUT_CLASS}
          value={contactUrl}
          placeholder="https://…"
          onChange={(changeEvent) => onContactUrlChange(changeEvent.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          A page you control — your site, a booking link, a form. Qatoto does not pass on your email
          address.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="submit"
          disabled={isSaveDisabled}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {isSaving ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/studio/pitches")}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-foreground"
        >
          Cancel
        </button>
      </div>

      {error !== null && (
        <p className="text-xs leading-4 text-destructive">
          {error.message || "Could not save the pitch."}
        </p>
      )}
    </form>
  );
}
