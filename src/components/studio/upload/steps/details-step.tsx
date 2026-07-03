"use client";

import Image from "next/image";
import { useState } from "react";
import { StudioStageBadge, StudioVideoType, UploadDraft } from "@/state/studio-videos-context";
import AnimeEpisodeFields, { createEmptyAnimeEpisodeDetails } from "./anime-episode-fields";

// Step 1 of the upload wizard. Everything is optional for the UI phase except
// the title (Save stays disabled without one — enforced by the modal footer).
const TITLE_MAXIMUM_LENGTH = 100;
const TAGS_MAXIMUM_LENGTH = 500;

const VIDEO_TYPE_OPTIONS: Array<{ value: StudioVideoType; label: string }> = [
  { value: "pitch", label: "Pitch" },
  { value: "demo", label: "Demo" },
  { value: "update", label: "Update" },
  { value: "ama", label: "AMA" },
  { value: "anime-episode", label: "Anime episode" },
];

const SECTOR_TAG_OPTIONS = [
  "AI",
  "Fintech",
  "Health",
  "Climate",
  "EdTech",
  "SaaS",
  "Robotics",
  "Commerce",
];

const STAGE_BADGE_OPTIONS: Array<{ value: StudioStageBadge; label: string }> = [
  { value: "idea", label: "Idea" },
  { value: "mvp", label: "MVP" },
  { value: "scaling", label: "Scaling" },
  { value: "shipped", label: "Shipped" },
];

const VIDEO_LANGUAGE_OPTIONS = ["English", "Hindi", "Japanese", "Spanish", "German"];
const CAPTION_CERTIFICATION_OPTIONS = [
  "None",
  "Has never aired on television in the U.S.",
  "Has only aired on television with captions",
];
const CATEGORY_OPTIONS = [
  "Science & Technology",
  "Education",
  "Entertainment",
  "Gaming",
  "Music",
  "People & Blogs",
];
const COMMENT_MODERATION_OPTIONS = ["None", "Basic", "Strict", "Hold all"];
const COMMENT_SORT_OPTIONS = ["Top", "Newest"];

type DetailsStepProps = {
  draft: UploadDraft;
  onDraftChange: (patch: Partial<UploadDraft>) => void;
  onOpenPlaylistsPicker: () => void;
};

export default function DetailsStep({
  draft,
  onDraftChange,
  onOpenPlaylistsPicker,
}: DetailsStepProps) {
  const [isAgeRestrictionSectionOpen, setIsAgeRestrictionSectionOpen] = useState(false);
  const [isShowMoreSectionOpen, setIsShowMoreSectionOpen] = useState(false);

  function handleVideoTypeSelect(videoType: StudioVideoType) {
    onDraftChange({
      videoType,
      animeEpisodeDetails:
        videoType === "anime-episode"
          ? (draft.animeEpisodeDetails ?? createEmptyAnimeEpisodeDetails())
          : draft.animeEpisodeDetails,
    });
  }

  function handleSectorTagToggle(sectorTag: string) {
    const isAlreadySelected = draft.sectorTags.includes(sectorTag);
    onDraftChange({
      sectorTags: isAlreadySelected
        ? draft.sectorTags.filter((selectedTag) => selectedTag !== sectorTag)
        : [...draft.sectorTags, sectorTag],
    });
  }

  const playlistsTriggerLabel =
    draft.selectedPlaylistTitles.length === 0
      ? "Select playlists"
      : `${draft.selectedPlaylistTitles.length} playlist${
          draft.selectedPlaylistTitles.length === 1 ? "" : "s"
        } selected`;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground">Details</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="upload-title" className="text-sm font-medium text-foreground">
            Title (required)
          </label>
          <input
            id="upload-title"
            type="text"
            value={draft.title}
            maxLength={TITLE_MAXIMUM_LENGTH}
            onChange={(event) => onDraftChange({ title: event.target.value })}
            placeholder="Add a title that describes your video"
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
          />
          <p className="text-right text-xs text-muted-foreground">
            {draft.title.length}/{TITLE_MAXIMUM_LENGTH}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="upload-description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="upload-description"
            value={draft.description}
            onChange={(event) => onDraftChange({ description: event.target.value })}
            placeholder="Tell viewers about your video (type @ to mention a creator)"
            rows={5}
            className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
          />
        </div>

        <PillOptionGroup
          groupLabel="Video type"
          helperText="Shapes the watch-page layout. Anime episodes go to admin review."
        >
          {VIDEO_TYPE_OPTIONS.map((videoTypeOption) => (
            <SelectablePill
              key={videoTypeOption.value}
              label={videoTypeOption.label}
              isSelected={draft.videoType === videoTypeOption.value}
              onClick={() => handleVideoTypeSelect(videoTypeOption.value)}
            />
          ))}
        </PillOptionGroup>

        <PillOptionGroup groupLabel="Sector / industry tags" helperText="Helps B2B discovery.">
          {SECTOR_TAG_OPTIONS.map((sectorTagOption) => (
            <SelectablePill
              key={sectorTagOption}
              label={sectorTagOption}
              isSelected={draft.sectorTags.includes(sectorTagOption)}
              onClick={() => handleSectorTagToggle(sectorTagOption)}
            />
          ))}
        </PillOptionGroup>

        <PillOptionGroup
          groupLabel="Stage badge"
          helperText="Signals where this product is in the pipeline."
        >
          {STAGE_BADGE_OPTIONS.map((stageBadgeOption) => (
            <SelectablePill
              key={stageBadgeOption.value}
              label={stageBadgeOption.label}
              isSelected={draft.stageBadge === stageBadgeOption.value}
              onClick={() => onDraftChange({ stageBadge: stageBadgeOption.value })}
            />
          ))}
        </PillOptionGroup>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Thumbnail</span>
          <div className="flex aspect-video w-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border">
            <Image
              src="/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
            <p className="px-2 text-center text-xs text-muted-foreground">Change in mobile app</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Links</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured fields — each renders as its own clickable element on the watch page, not as
            links in the description.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledTextInput
            fieldId="upload-website-url"
            label="Website URL"
            value={draft.websiteUrl}
            placeholder="https://yourproduct.com"
            onValueChange={(websiteUrl) => onDraftChange({ websiteUrl })}
          />
          <LabeledTextInput
            fieldId="upload-cta-label"
            label="Call-to-action button"
            value={draft.callToActionLabel}
            placeholder="e.g. Book a demo, Join waitlist"
            onValueChange={(callToActionLabel) => onDraftChange({ callToActionLabel })}
          />
          <LabeledTextInput
            fieldId="upload-linkedin-url"
            label="LinkedIn"
            value={draft.linkedinUrl}
            placeholder="https://linkedin.com/company/…"
            onValueChange={(linkedinUrl) => onDraftChange({ linkedinUrl })}
          />
          <LabeledTextInput
            fieldId="upload-x-url"
            label="X"
            value={draft.xProfileUrl}
            placeholder="https://x.com/…"
            onValueChange={(xProfileUrl) => onDraftChange({ xProfileUrl })}
          />
          <LabeledTextInput
            fieldId="upload-contact-email"
            label="Contact email"
            value={draft.contactEmail}
            placeholder="founders@yourproduct.com"
            onValueChange={(contactEmail) => onDraftChange({ contactEmail })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground">Playlists</h3>
        <button
          type="button"
          onClick={onOpenPlaylistsPicker}
          className="flex h-12 w-full cursor-pointer items-center justify-between rounded-lg border border-border px-3 text-sm text-foreground transition-colors hover:bg-secondary/50 sm:w-80"
        >
          {playlistsTriggerLabel}
          <Image
            src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
        </button>
        {draft.selectedPlaylistTitles.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {draft.selectedPlaylistTitles.join(" · ")}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Audience</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Is this video made for kids? (required)
          </p>
        </div>
        <div className="flex gap-2">
          <SelectablePill
            label="Yes, it's made for kids"
            isSelected={draft.isMadeForKids === true}
            onClick={() => onDraftChange({ isMadeForKids: true })}
          />
          <SelectablePill
            label="No, it's not made for kids"
            isSelected={draft.isMadeForKids === false}
            onClick={() => onDraftChange({ isMadeForKids: false })}
          />
        </div>

        <CollapsibleSectionToggle
          label="Age restriction (advanced)"
          isOpen={isAgeRestrictionSectionOpen}
          onToggle={() => setIsAgeRestrictionSectionOpen(!isAgeRestrictionSectionOpen)}
        />
        {isAgeRestrictionSectionOpen && (
          <CheckboxRow
            label="Restrict my video to viewers over 18"
            isChecked={draft.hasAgeRestriction}
            onToggle={() => onDraftChange({ hasAgeRestriction: !draft.hasAgeRestriction })}
          />
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <CollapsibleSectionToggle
          label="Show more"
          isOpen={isShowMoreSectionOpen}
          onToggle={() => setIsShowMoreSectionOpen(!isShowMoreSectionOpen)}
        />

        {isShowMoreSectionOpen && (
          <div className="flex flex-col gap-5">
            <CheckboxRow
              label="This video contains paid promotion like a product placement, sponsorship, or endorsement"
              isChecked={draft.hasPaidPromotion}
              onToggle={() => onDraftChange({ hasPaidPromotion: !draft.hasPaidPromotion })}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Altered content — does this video use AI?
              </span>
              <div className="flex gap-2">
                <SelectablePill
                  label="Yes"
                  isSelected={draft.usesAlteredContent === true}
                  onClick={() => onDraftChange({ usesAlteredContent: true })}
                />
                <SelectablePill
                  label="No"
                  isSelected={draft.usesAlteredContent === false}
                  onClick={() => onDraftChange({ usesAlteredContent: false })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="upload-tags" className="text-sm font-medium text-foreground">
                Tags
              </label>
              <input
                id="upload-tags"
                type="text"
                value={draft.commaSeparatedTags}
                maxLength={TAGS_MAXIMUM_LENGTH}
                onChange={(event) => onDraftChange({ commaSeparatedTags: event.target.value })}
                placeholder="Separate tags with commas"
                className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
              />
              <p className="text-right text-xs text-muted-foreground">
                {draft.commaSeparatedTags.length}/{TAGS_MAXIMUM_LENGTH}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledSelect
                fieldId="upload-video-language"
                label="Video language"
                value={draft.videoLanguage}
                options={VIDEO_LANGUAGE_OPTIONS}
                onValueChange={(videoLanguage) => onDraftChange({ videoLanguage })}
              />
              <LabeledSelect
                fieldId="upload-caption-certification"
                label="Caption certification"
                value={draft.captionCertification}
                options={CAPTION_CERTIFICATION_OPTIONS}
                onValueChange={(captionCertification) => onDraftChange({ captionCertification })}
              />
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="upload-recording-date"
                  className="text-sm font-medium text-foreground"
                >
                  Recording date
                </label>
                <input
                  id="upload-recording-date"
                  type="date"
                  value={draft.recordingDate}
                  onChange={(event) => onDraftChange({ recordingDate: event.target.value })}
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
                />
              </div>
              <LabeledTextInput
                fieldId="upload-recording-location"
                label="Recording location"
                value={draft.recordingLocation}
                placeholder="e.g. Mumbai, India"
                onValueChange={(recordingLocation) => onDraftChange({ recordingLocation })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">License</span>
              <div className="flex gap-2">
                <SelectablePill
                  label="Standard"
                  isSelected={draft.license === "standard"}
                  onClick={() => onDraftChange({ license: "standard" })}
                />
                <SelectablePill
                  label="Creative Commons"
                  isSelected={draft.license === "creative-commons"}
                  onClick={() => onDraftChange({ license: "creative-commons" })}
                />
              </div>
            </div>

            <CheckboxRow
              label="Allow embedding"
              isChecked={draft.isEmbeddingAllowed}
              onToggle={() => onDraftChange({ isEmbeddingAllowed: !draft.isEmbeddingAllowed })}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Shorts remixing</span>
              <div className="flex gap-2">
                <SelectablePill
                  label="Video and audio"
                  isSelected={draft.shortsRemixing === "video-and-audio"}
                  onClick={() => onDraftChange({ shortsRemixing: "video-and-audio" })}
                />
                <SelectablePill
                  label="Audio only"
                  isSelected={draft.shortsRemixing === "audio-only"}
                  onClick={() => onDraftChange({ shortsRemixing: "audio-only" })}
                />
              </div>
            </div>

            <LabeledSelect
              fieldId="upload-category"
              label="Category"
              value={draft.category}
              options={CATEGORY_OPTIONS}
              onValueChange={(category) => onDraftChange({ category })}
            />

            <div className="flex flex-col gap-3">
              <CheckboxRow
                label="Allow comments"
                isChecked={draft.areCommentsEnabled}
                onToggle={() => onDraftChange({ areCommentsEnabled: !draft.areCommentsEnabled })}
              />
              {draft.areCommentsEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <LabeledSelect
                    fieldId="upload-comment-moderation"
                    label="Comment moderation"
                    value={draft.commentModeration}
                    options={COMMENT_MODERATION_OPTIONS}
                    onValueChange={(commentModeration) => onDraftChange({ commentModeration })}
                  />
                  <LabeledSelect
                    fieldId="upload-comment-sort"
                    label="Sort comments by"
                    value={draft.commentSortOrder}
                    options={COMMENT_SORT_OPTIONS}
                    onValueChange={(commentSortOrder) => onDraftChange({ commentSortOrder })}
                  />
                </div>
              )}
            </div>

            <CheckboxRow
              label="Show how many viewers like this video"
              isChecked={draft.shouldShowLikesCount}
              onToggle={() => onDraftChange({ shouldShowLikesCount: !draft.shouldShowLikesCount })}
            />
          </div>
        )}
      </section>

      {draft.videoType === "anime-episode" && draft.animeEpisodeDetails && (
        <AnimeEpisodeFields
          episodeDetails={draft.animeEpisodeDetails}
          onEpisodeDetailsChange={(episodeDetailsPatch) =>
            onDraftChange({
              animeEpisodeDetails: {
                ...(draft.animeEpisodeDetails ?? createEmptyAnimeEpisodeDetails()),
                ...episodeDetailsPatch,
              },
            })
          }
        />
      )}
    </div>
  );
}

/* ---------- Local field helpers (file-scoped, per repo convention) ---------- */

function SelectablePill({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isSelected
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function PillOptionGroup({
  groupLabel,
  helperText,
  children,
}: {
  groupLabel: string;
  helperText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{groupLabel}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}

function CheckboxRow({
  label,
  isChecked,
  onToggle,
}: {
  label: string;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex cursor-pointer items-start gap-3 text-left"
    >
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
          isChecked ? "border-foreground bg-foreground" : "border-border"
        }`}
      >
        {isChecked && (
          <Image
            src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
            alt=""
            width={14}
            height={14}
          />
        )}
      </span>
      <span className="text-sm text-foreground">{label}</span>
    </button>
  );
}

function CollapsibleSectionToggle({
  label,
  isOpen,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
    >
      {label}
      <Image
        src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={20}
        height={20}
        className={isOpen ? "rotate-180" : ""}
      />
    </button>
  );
}

function LabeledTextInput({
  fieldId,
  label,
  value,
  placeholder,
  onValueChange,
}: {
  fieldId: string;
  label: string;
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
      />
    </div>
  );
}

function LabeledSelect({
  fieldId,
  label,
  value,
  options,
  onValueChange,
}: {
  fieldId: string;
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Image
          src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={20}
          height={20}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        />
      </div>
    </div>
  );
}
