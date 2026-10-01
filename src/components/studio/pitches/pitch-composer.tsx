"use client";

import Link from "next/link";
import StatusPanel from "@/components/home/shared/status-panel";
import PitchVideoPicker from "@/components/studio/pitches/pitch-video-picker";
import { PitchDisclaimer } from "@/components/pitches/pitch-shared";
import { usePitchComposerState } from "@/hooks/rnd/use-pitch-composer-state";
import { PitchComposerForm } from "./pitch-composer-form";

export default function PitchComposer({ pitchId }: { readonly pitchId?: string }) {
  const {
    isEditing,
    existingPitch,
    projectsQuery,
    myPitchesQuery,
    projectSlug,
    setProjectSlug,
    title,
    setTitle,
    summary,
    setSummary,
    fundingUrl,
    setFundingUrl,
    contactUrl,
    setContactUrl,
    pitchVideoId,
    setPitchVideoId,
    pitchVideoTitle,
    setPitchVideoTitle,
    isVideoPickerOpen,
    setIsVideoPickerOpen,
    activeMutation,
    isSaveDisabled,
    handleSubmit,
  } = usePitchComposerState(pitchId);

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
        <PitchComposerForm
          isEditing={isEditing}
          projectSlug={projectSlug}
          onProjectSlugChange={setProjectSlug}
          projects={projectsQuery.data?.rows ?? []}
          pitchVideoId={pitchVideoId}
          pitchVideoTitle={pitchVideoTitle}
          onOpenVideoPicker={() => setIsVideoPickerOpen(true)}
          onRemoveVideo={() => {
            setPitchVideoId(null);
            setPitchVideoTitle(null);
          }}
          title={title}
          onTitleChange={setTitle}
          summary={summary}
          onSummaryChange={setSummary}
          fundingUrl={fundingUrl}
          onFundingUrlChange={setFundingUrl}
          contactUrl={contactUrl}
          onContactUrlChange={setContactUrl}
          isSaveDisabled={isSaveDisabled}
          isSaving={activeMutation.isPending}
          error={activeMutation.error}
          onSubmit={handleSubmit}
        />
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
