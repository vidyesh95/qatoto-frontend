// TRANSPORT: client-query — "use client" island. Reads GET /discovery/talent/me and
// GET /discovery/skills, writes PUT /discovery/talent/me and POST …/publish · /unpublish.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import RndSheet from "@/components/home/research-and-development/sheets/rnd-sheet";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useDiscoverySkillsQuery,
  useMyTalentProfileQuery,
  useSaveTalentProfileMutation,
  useUnpublishTalentProfileMutation,
} from "@/hooks/rnd/discovery";
import { ApiRequestError } from "@/lib/http";
import {
  TALENT_AVAILABILITIES,
  TalentAvailabilitySchema,
  type TalentAvailability,
  type TalentProfileMe,
} from "@/lib/rnd/discovery.schemas";
import { ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";
import {
  ROLE_COMMITMENTS,
  RoleCommitmentSchema,
  type RoleCommitment,
} from "@/lib/rnd/shared.schemas";

const AVAILABILITY_LABELS: Record<TalentAvailability, string> = {
  open_to_work: "Open to work",
  open_to_offers: "Open to offers",
  unavailable: "Unavailable",
};

/** The server's own field names, turned into something a person can act on. */
const MISSING_FIELD_LABELS: Record<string, string> = {
  headlineRole: "a headline role",
  skills: "at least one skill",
  skillSlugs: "at least one skill",
  bio: "a short bio",
};

/**
 * Edit your own talent profile.
 *
 * IT SAVED NOTHING BEFORE, which on this surface meant the directory only ever described
 * people as they were the day their row was written.
 *
 * **SKILLS ARE CHOSEN FROM THE CANONICAL VOCABULARY, NEVER TYPED.** The old form had a
 * free-text skill input. `skillSlugs` is validated as a SUBSET of `discovery_skill`
 * server-side, so free text is a `422` naming the offenders — and if it were not, one
 * person's spelling would become taxonomy nothing else matches. The chips come from
 * `GET /discovery/skills`.
 *
 * **`isVerified` IS ABSENT FROM EVERYTHING THIS FORM SENDS**, which is the whole meaning of
 * the badge: it says §9 recorded verified effort on a project tagged with that skill. If a
 * request could set it, it would say nothing.
 *
 * **`completeness` IS A HINT, NOT THE CHECK.** It disables the publish button early and —
 * more usefully — names what is missing. `publishTalentProfile` re-derives it server-side,
 * so a client that ignored the field gets a refusal rather than a published profile.
 *
 * `PUT`, not `PATCH`: the whole profile goes every time, because a partial would make
 * "cleared this field" and "did not touch it" the same request.
 */
type DiscoverySkillItem = NonNullable<ReturnType<typeof useDiscoverySkillsQuery>["data"]>[number];

function mapLoadedCompensationAsks(loadedProfile?: TalentProfileMe) {
  return (loadedProfile?.compensationAsks ?? []).map((ask) => {
    switch (ask.kind) {
      case "salary":
        return {
          kind: "salary" as const,
          salaryMinInCentsPerMonth: ask.salaryMinInCentsPerMonth,
          ...(ask.salaryMaxInCentsPerMonth === null
            ? {}
            : { salaryMaxInCentsPerMonth: ask.salaryMaxInCentsPerMonth }),
        };
      case "one_time":
        return {
          kind: "one_time" as const,
          oneTimeMinInCents: ask.oneTimeMinInCents,
          ...(ask.oneTimeMaxInCents === null ? {} : { oneTimeMaxInCents: ask.oneTimeMaxInCents }),
        };
      case "equity":
        return {
          kind: "equity" as const,
          equityBasisPointsMin: ask.equityBasisPointsMin,
          ...(ask.equityBasisPointsMax === null
            ? {}
            : { equityBasisPointsMax: ask.equityBasisPointsMax }),
        };
      default: {
        const exhaustiveCheck: never = ask;
        return exhaustiveCheck;
      }
    }
  });
}

function TalentProfileSkillSelector({
  skills,
  selectedSlugs,
  onToggleSkill,
}: {
  skills: readonly DiscoverySkillItem[];
  selectedSlugs: readonly string[];
  onToggleSkill: (slug: string) => void;
}) {
  const selectedSlugsSet = new Set(selectedSlugs);

  return (
    <div className="flex flex-col gap-1">
      <span className={LABEL_CLASS}>Skills</span>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <button
            key={skill.slug}
            type="button"
            onClick={() => onToggleSkill(skill.slug)}
            aria-pressed={selectedSlugsSet.has(skill.slug)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ${
              selectedSlugsSet.has(skill.slug)
                ? "bg-primary-imprint text-primary-imprint-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {skill.displayLabel}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        Chosen from Qatoto&apos;s skill list, not typed. A ✓ on your public profile means the
        verification pipeline recorded effort against that skill — nobody can set that by hand,
        including you.
      </span>
    </div>
  );
}

function TalentProfileActions({
  isSavePending,
  isUnpublishPending,
  isPublished,
  isPublishable,
  missingForPublish,
  onSaveAndPublish,
  onUnpublish,
}: {
  isSavePending: boolean;
  isUnpublishPending: boolean;
  isPublished: boolean;
  isPublishable: boolean;
  missingForPublish: readonly string[];
  onSaveAndPublish: () => void;
  onUnpublish: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSavePending}
          className="rounded-full border border-primary-imprint/40 px-4 py-2 text-sm font-medium text-primary-imprint disabled:opacity-40"
        >
          {isSavePending ? "Saving…" : "Save"}
        </button>

        {isPublished ? (
          <button
            type="button"
            disabled={isUnpublishPending}
            onClick={onUnpublish}
            className="rounded-full border border-outline-variant px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Take it out of the directory
          </button>
        ) : (
          <button
            type="button"
            disabled={isSavePending || !isPublishable}
            onClick={onSaveAndPublish}
            className="rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground disabled:opacity-40"
          >
            Save and publish
          </button>
        )}
      </div>

      {!isPublished && missingForPublish.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Before it can be published you need{" "}
          {missingForPublish.map((field) => MISSING_FIELD_LABELS[field] ?? field).join(", ")}.
        </p>
      )}
    </>
  );
}

function EditTalentProfileForm({ onClose: _onClose }: { onClose: () => void }) {
  const [headlineRole, setHeadlineRole] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState<TalentAvailability>("open_to_offers");
  const [commitment, setCommitment] = useState<RoleCommitment>("part_time");
  const [locationLabel, setLocationLabel] = useState("");
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [seededProfile, setSeededProfile] = useState<TalentProfileMe | undefined>(undefined);

  const profileQuery = useMyTalentProfileQuery(true);
  const skillsQuery = useDiscoverySkillsQuery();
  const saveMutation = useSaveTalentProfileMutation();
  const unpublishMutation = useUnpublishTalentProfileMutation();

  const loadedProfile = profileQuery.data;
  if (loadedProfile !== undefined && loadedProfile !== seededProfile) {
    setSeededProfile(loadedProfile);
    setHeadlineRole(loadedProfile.headlineRole);
    setBio(loadedProfile.bio ?? "");
    setAvailability(loadedProfile.availability);
    setCommitment(loadedProfile.commitment);
    setLocationLabel(loadedProfile.locationLabel ?? "");
    setSkillSlugs(loadedProfile.skills.map((skill) => skill.slug));
  }

  const saveError = [saveMutation.error, unpublishMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const missingForPublish = loadedProfile?.completeness.missing ?? [];
  const isPublishable = loadedProfile?.completeness.isPublishable ?? false;
  const isPublished = loadedProfile?.isPublished ?? false;

  function toggleSkill(skillSlug: string) {
    setSkillSlugs((previousSlugs) => {
      const previousSlugsSet = new Set(previousSlugs);
      return previousSlugsSet.has(skillSlug)
        ? previousSlugs.filter((slug) => slug !== skillSlug)
        : [...previousSlugs, skillSlug];
    });
  }

  function saveProfile(shouldPublish: boolean) {
    saveMutation.mutate({
      input: {
        headlineRole: headlineRole.trim(),
        availability,
        commitment,
        locationLabel: locationLabel.trim() || null,
        bio: bio.trim() || null,
        skillSlugs,
        compensationAsks: mapLoadedCompensationAsks(loadedProfile),
      },
      shouldPublish,
    });
  }

  return (
    <form
      className="flex flex-col gap-4 px-4 pb-6"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        saveProfile(false);
      }}
    >
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Headline role</span>
        <input
          type="text"
          value={headlineRole}
          onChange={(changeEvent) => setHeadlineRole(changeEvent.target.value)}
          placeholder="e.g. Embedded firmware engineer"
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>About you</span>
        <textarea
          value={bio}
          onChange={(changeEvent) => setBio(changeEvent.target.value)}
          rows={4}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Availability</span>
        <select
          value={availability}
          onChange={(changeEvent) => {
            const parsed = TalentAvailabilitySchema.safeParse(changeEvent.target.value);
            if (parsed.success) setAvailability(parsed.data);
          }}
          className={INPUT_CLASS}
        >
          {TALENT_AVAILABILITIES.map((option) => (
            <option key={option} value={option}>
              {AVAILABILITY_LABELS[option]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Commitment</span>
        <select
          value={commitment}
          onChange={(changeEvent) => {
            const parsed = RoleCommitmentSchema.safeParse(changeEvent.target.value);
            if (parsed.success) setCommitment(parsed.data);
          }}
          className={INPUT_CLASS}
        >
          {ROLE_COMMITMENTS.map((option) => (
            <option key={option} value={option}>
              {ROLE_COMMITMENT_LABELS[option]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Where you are</span>
        <input
          type="text"
          value={locationLabel}
          onChange={(changeEvent) => setLocationLabel(changeEvent.target.value)}
          placeholder="City or region"
          className={INPUT_CLASS}
        />
      </label>

      <TalentProfileSkillSelector
        skills={skillsQuery.data ?? []}
        selectedSlugs={skillSlugs}
        onToggleSkill={toggleSkill}
      />

      <TalentProfileActions
        isSavePending={saveMutation.isPending}
        isUnpublishPending={unpublishMutation.isPending}
        isPublished={isPublished}
        isPublishable={isPublishable}
        missingForPublish={missingForPublish}
        onSaveAndPublish={() => saveProfile(true)}
        onUnpublish={() => unpublishMutation.mutate()}
      />

      {saveError !== undefined && <MutationErrorNotice error={saveError.apiError} />}
      {saveMutation.isSuccess && <p className="text-sm text-primary-imprint">Saved.</p>}
    </form>
  );
}

export default function EditTalentProfileSheet() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer rounded-full border border-outline-strong px-4 py-2 text-sm font-medium text-primary-imprint"
      >
        Edit your profile
      </button>

      <RndSheet
        title="Your talent profile"
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      >
        {isSheetOpen && <EditTalentProfileForm onClose={() => setIsSheetOpen(false)} />}
      </RndSheet>
    </>
  );
}
