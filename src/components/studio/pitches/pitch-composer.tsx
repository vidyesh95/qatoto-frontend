// TRANSPORT: client-query — writes `POST /research-projects/:projectSlug/pitches` and
// `PATCH /pitches/:pitchId`, reads `GET /research-projects/mine` for the venture picker and
// `GET /pitches/mine` to load the pitch being edited.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import StatusPanel from "@/components/home/shared/status-panel";
import { PitchDisclaimer } from "@/components/pitches/pitch-shared";
import PitchVideoPicker from "@/components/studio/pitches/pitch-video-picker";
import {
  useCreatePitchMutation,
  useMyPitchesQuery,
  useUpdatePitchMutation,
} from "@/hooks/rnd/pitches";
import { useMyProjectsQuery } from "@/hooks/rnd/projects";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";

/**
 * Write or edit a pitch.
 *
 * ONE COMPONENT, TWO MODES, because the fields are identical and two files would drift. The
 * mode is decided by which prop arrives: `pitchId` means edit, otherwise create.
 *
 * ⚠️ SAVING IS NOT PUBLISHING AND NOT EVEN SUBMITTING. This writes a draft. Submitting is a
 * separate act on the list page, and a moderator decides after that — so nothing on this
 * screen says live, listed or published.
 *
 * ⚠️ THERE IS NO AMOUNT FIELD AND NO EQUITY FIELD, and adding one is not a small change.
 * "Raising $X for Y%" on a Qatoto-hosted page is a general solicitation; the backend stores
 * no such column, and `commerce_cofounder_profile` refused the same pair for the same
 * reason. The ask belongs on the funding page the link points at.
 *
 * A SINGLE PAGE, NOT A WIZARD. Four fields and two URLs do not earn steps — the composer
 * rail in `@/components/commerce/composer` is there if this ever grows past about six.
 */
export default function PitchComposer({ pitchId }: { readonly pitchId?: string }) {
  const router = useRouter();
  const isEditing = pitchId !== undefined;

  const projectsQuery = useMyProjectsQuery("active");
  // The edit form seeds itself from the founder's own list rather than a detail read: the
  // public `GET /pitches/:slug` serves published pitches only, and a draft — the thing most
  // likely to be edited — is not one.
  const myPitchesQuery = useMyPitchesQuery(1, undefined);

  const existingPitch = isEditing
    ? myPitchesQuery.data?.rows.find((row) => row.id === pitchId)
    : undefined;

  // STATE BEFORE THE MUTATIONS, because `useCreatePitchMutation` takes the chosen venture as
  // an argument — reading it above these declarations is a temporal-dead-zone crash on the
  // first render, not a lint nit.
  const [projectSlug, setProjectSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [fundingUrl, setFundingUrl] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  const [hasSeededFromServer, setHasSeededFromServer] = useState(false);
  // The id is what the write sends; the label is only so the form can show what is chosen
  // without a second read. Both are cleared together.
  const [pitchVideoId, setPitchVideoId] = useState<string | null>(null);
  const [pitchVideoTitle, setPitchVideoTitle] = useState<string | null>(null);
  const [isVideoPickerOpen, setIsVideoPickerOpen] = useState(false);

  const createMutation = useCreatePitchMutation(projectSlug);
  const updateMutation = useUpdatePitchMutation();

  // Seed once, when the row arrives. A `useEffect` that re-ran on every render of the query
  // would overwrite what the founder is typing each time the list refetched.
  if (isEditing && existingPitch !== undefined && !hasSeededFromServer) {
    setTitle(existingPitch.title);
    setSummary(existingPitch.summary);
    setFundingUrl(existingPitch.externalFundingUrl ?? "");
    setContactUrl(existingPitch.externalContactUrl ?? "");
    setProjectSlug(existingPitch.projectSlug);
    setPitchVideoId(existingPitch.pitchVideo?.videoId ?? null);
    setPitchVideoTitle(existingPitch.pitchVideo?.title ?? null);
    setHasSeededFromServer(true);
  }

  const activeMutation = isEditing ? updateMutation : createMutation;
  const isSaveDisabled =
    activeMutation.isPending ||
    title.trim().length < 3 ||
    summary.trim().length < 20 ||
    (!isEditing && projectSlug.length === 0);

  if (activeMutation.isSuccess) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {isEditing ? "Pitch saved" : "Draft created"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          It is <strong>not public</strong>. Submit it for review from your pitches list, and a
          moderator will check it for spam, scams and illegal content — not for whether the venture
          is a good one.
        </p>
        <Link
          href="/studio/pitches"
          className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to your pitches
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">
        {isEditing ? "Edit pitch" : "New pitch"}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        This saves a draft. It is not listed until you submit it and a moderator approves it.
      </p>

      <div className="mt-4 max-w-2xl">
        <PitchDisclaimer />
      </div>

      {isEditing && myPitchesQuery.isPending && (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      )}

      {isEditing && !myPitchesQuery.isPending && existingPitch === undefined && (
        <div className="mt-6 max-w-2xl">
          <StatusPanel message="That pitch is not one of yours, or no longer exists." />
        </div>
      )}

      {(!isEditing || existingPitch !== undefined) && (
        <form
          className="mt-6 flex max-w-2xl flex-col gap-4"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            if (isEditing) {
              updateMutation.mutate({
                pitchId,
                input: {
                  title: title.trim(),
                  summary: summary.trim(),
                  // `null` CLEARS the link, an empty string is not a valid URL. Emptying the
                  // field has to mean "remove it", or a founder can add a funding link and
                  // never take it down.
                  // `null` detaches the video, exactly as it clears a link.
                  pitchVideoId,
                  externalFundingUrl: fundingUrl.trim().length === 0 ? null : fundingUrl.trim(),
                  externalContactUrl: contactUrl.trim().length === 0 ? null : contactUrl.trim(),
                },
              });
              return;
            }
            createMutation.mutate({
              title: title.trim(),
              summary: summary.trim(),
              ...(pitchVideoId === null ? {} : { pitchVideoId }),
              ...(fundingUrl.trim().length === 0 ? {} : { externalFundingUrl: fundingUrl.trim() }),
              ...(contactUrl.trim().length === 0 ? {} : { externalContactUrl: contactUrl.trim() }),
            });
          }}
        >
          {!isEditing && (
            <div>
              <label className={LABEL_CLASS} htmlFor="pitch-project">
                Venture
              </label>
              <select
                id="pitch-project"
                className={INPUT_CLASS}
                value={projectSlug}
                onChange={(changeEvent) => {
                  setProjectSlug(changeEvent.target.value);
                }}
              >
                <option value="">Choose a venture…</option>
                {(projectsQuery.data?.rows ?? []).map((project) => (
                  <option key={project.slug} value={project.slug}>
                    {project.name}
                  </option>
                ))}
              </select>
              {/* PUBLISHED VENTURES ONLY in this list, and the sentence says why rather than
                  leaving a founder to wonder where their draft went. A pitch on a draft
                  venture cannot be submitted — its review would be the thing that revealed
                  the venture. */}
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
                  onClick={() => {
                    setIsVideoPickerOpen(true);
                  }}
                  className="mt-1 block cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-foreground disabled:opacity-40"
                >
                  Choose a video
                </button>
                {/* PROMPTED, NOT REQUIRED. A founder whose video is still processing must not
                    be blocked — the background job that verifies a YouTube embed is not
                    theirs to hurry — so this is a sentence rather than a gate. */}
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
                  onClick={() => {
                    setIsVideoPickerOpen(true);
                  }}
                  className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs text-foreground"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPitchVideoId(null);
                    setPitchVideoTitle(null);
                  }}
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
              onChange={(changeEvent) => {
                setTitle(changeEvent.target.value);
              }}
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
              onChange={(changeEvent) => {
                setSummary(changeEvent.target.value);
              }}
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
              onChange={(changeEvent) => {
                setFundingUrl(changeEvent.target.value);
              }}
            />
            {/* NAMED PLAINLY. Qatoto takes no money, so if this is blank there is no way to
                fund the pitch from Qatoto at all — that is the design, not a gap. */}
            <p className="mt-1 text-xs text-muted-foreground">
              Where people actually fund you — your Kickstarter, Wefunder, Ketto or payment page.
              Qatoto takes no money and holds none; this link is the whole mechanism. Must start
              with https://.
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
              onChange={(changeEvent) => {
                setContactUrl(changeEvent.target.value);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A page you control — your site, a booking link, a form. Qatoto does not pass on your
              email address.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button
              type="submit"
              disabled={isSaveDisabled}
              className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {activeMutation.isPending ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => {
                router.push("/studio/pitches");
              }}
              className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-foreground"
            >
              Cancel
            </button>
          </div>

          {/* The backend names the field it refused — a bad URL says which of the two it was
              — so the message is rendered verbatim rather than replaced with a generic one. */}
          {activeMutation.error !== null && (
            <p className="text-xs leading-4 text-destructive">
              {activeMutation.error instanceof Error
                ? activeMutation.error.message
                : "Could not save the pitch."}
            </p>
          )}
        </form>
      )}

      {isVideoPickerOpen && (
        <PitchVideoPicker
          projectSlug={projectSlug}
          selectedVideoId={pitchVideoId}
          onSelect={(video) => {
            setPitchVideoId(video?.videoId ?? null);
            setPitchVideoTitle(video?.title ?? null);
          }}
          onDone={() => {
            setIsVideoPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
