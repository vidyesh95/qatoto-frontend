"use client";

import Image from "next/image";
import { useState } from "react";
import type { StudioStageBadge, StudioVideoType, UploadDraft } from "@/lib/videos/studio-view";
import ThumbnailPicker from "@/components/studio/upload/thumbnail-picker";
import { useFeedCategoriesQuery } from "@/hooks/feed/queries";
import { useMyPlaylistsQuery } from "@/hooks/playlists";
import { MAX_CATEGORIES_PER_VIDEO } from "@/lib/videos/studio-view";

// Step 1 of the upload wizard. Everything is optional for the UI phase except
// the title (Save stays disabled without one — enforced by the modal footer).
const TITLE_MAXIMUM_LENGTH = 100;
const TAGS_MAXIMUM_LENGTH = 500;

const VIDEO_TYPE_OPTIONS: Array<{ value: StudioVideoType; label: string }> = [
  { value: "pitch", label: "Pitch" },
  { value: "demo", label: "Demo" },
  { value: "update", label: "Update" },
  { value: "ama", label: "AMA" },
  // NO `anime_episode` OPTION. The vertical was retired with `/anime`, so nothing new is
  // uploaded as one. The VALUE still exists in `VIDEO_TYPES` because it is a backend pgEnum
  // label and removing it needs a migration — and `videos-list.tsx` still LABELS it, so any
  // historical row renders with a type instead of a blank. Stop offering; keep displaying.
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
const COMMENT_MODERATION_OPTIONS = ["None", "Basic", "Strict", "Hold all"];
const COMMENT_SORT_OPTIONS = ["Top", "Newest"];

/**
 * Up to three categories, chosen from the live taxonomy.
 *
 * Reads the same route the homepage chip row reads, so a category a moderator publishes is
 * immediately taggable — that is the point of the taxonomy being a table rather than an enum.
 */
function CategoryMultiSelect({
  selectedCategoryIds,
  onCategoryToggle,
}: {
  readonly selectedCategoryIds: string[];
  readonly onCategoryToggle: (categoryId: string) => void;
}) {
  const categoriesQuery = useFeedCategoriesQuery([]);
  const categories = categoriesQuery.data ?? [];
  const isAtLimit = selectedCategoryIds.length >= MAX_CATEGORIES_PER_VIDEO;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        Categories (up to {MAX_CATEGORIES_PER_VIDEO})
      </span>
      {categoriesQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading categories…</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories available.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isSelected = selectedCategoryIds.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryToggle(category.id)}
                aria-pressed={isSelected}
                // Unselected chips go inert at the cap rather than vanishing, so the creator
                // can see what they would have to give up to pick something else.
                disabled={!isSelected && isAtLimit}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-40"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The chosen playlists by name, resolved from the same query the picker uses. */
function SelectedPlaylistNames({
  selectedPlaylistIds,
}: {
  readonly selectedPlaylistIds: string[];
}) {
  const playlistsQuery = useMyPlaylistsQuery({ limit: 100 });
  if (selectedPlaylistIds.length === 0) return null;

  const selectedTitles = (playlistsQuery.data?.rows ?? [])
    .filter((playlist) => selectedPlaylistIds.includes(playlist.id))
    .map((playlist) => playlist.title);

  return (
    <p className="text-xs text-muted-foreground">
      {selectedTitles.length > 0
        ? selectedTitles.join(" · ")
        : `${selectedPlaylistIds.length} selected`}
    </p>
  );
}

type DetailsStepProps = {
  draft: UploadDraft;
  onDraftChange: (patch: Partial<UploadDraft>) => void;
  onOpenPlaylistsPicker: () => void;
  /** The saved thumbnail in edit mode, so the picker previews it instead of YouTube's. */
  currentThumbnailUrl?: string | null;
  selectedThumbnailFile: File | null;
  onThumbnailFileSelected: (file: File | null) => void;
};

export default function DetailsStep({
  draft,
  onDraftChange,
  onOpenPlaylistsPicker,
  currentThumbnailUrl,
  selectedThumbnailFile,
  onThumbnailFileSelected,
}: DetailsStepProps) {
  const [isAgeRestrictionSectionOpen, setIsAgeRestrictionSectionOpen] = useState(false);
  const [isShowMoreSectionOpen, setIsShowMoreSectionOpen] = useState(false);

  function handleVideoTypeSelect(videoType: StudioVideoType) {
    onDraftChange({ videoType });
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
    draft.selectedPlaylistIds.length === 0
      ? "Select playlists"
      : `${draft.selectedPlaylistIds.length} playlist${
          draft.selectedPlaylistIds.length === 1 ? "" : "s"
        } selected`;

  function handleCategoryToggle(categoryId: string) {
    const isAlreadySelected = draft.categoryIds.includes(categoryId);
    if (isAlreadySelected) {
      onDraftChange({
        categoryIds: draft.categoryIds.filter((selectedId) => selectedId !== categoryId),
      });
      return;
    }
    // The backend caps this at 3 and answers 422 on a fourth. Refusing here as well means the
    // creator meets the limit at the control rather than at Save, three steps later.
    if (draft.categoryIds.length >= MAX_CATEGORIES_PER_VIDEO) return;
    onDraftChange({ categoryIds: [...draft.categoryIds, categoryId] });
  }

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

        <PillOptionGroup groupLabel="Video type" helperText="Shapes the watch-page layout.">
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

        {/*
          WAS A DEAD BOX READING "Change in mobile app". `POST /videos/:videoId/thumbnail` has
          existed the whole time; this slot just never called it. The picker validates the file
          and hands it up — the MODAL owns the upload, because in create mode there is no
          `videoId` to upload against until the video exists.
        */}
        <ThumbnailPicker
          youtubeUrl={draft.youtubeUrl}
          currentThumbnailUrl={currentThumbnailUrl}
          selectedFile={selectedThumbnailFile}
          onFileSelected={onThumbnailFileSelected}
        />
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
        {/*
          NAMES, not a count. The draft holds ids so the picker can key on something unique, but
          "3 selected" tells the creator nothing about WHICH three — the mock showed the titles
          and losing them was a regression, not a simplification. The list is already fetched by
          the picker, so this shares its cache entry rather than adding a request.
        */}
        <SelectedPlaylistNames selectedPlaylistIds={draft.selectedPlaylistIds} />
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
                  isSelected={draft.license === "creative_commons"}
                  onClick={() => onDraftChange({ license: "creative_commons" })}
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
                  isSelected={draft.shortsRemixing === "video_and_audio"}
                  onClick={() => onDraftChange({ shortsRemixing: "video_and_audio" })}
                />
                <SelectablePill
                  label="Audio only"
                  isSelected={draft.shortsRemixing === "audio_only"}
                  onClick={() => onDraftChange({ shortsRemixing: "audio_only" })}
                />
              </div>
            </div>

            {/*
              WAS A SINGLE SELECT OVER SIX HARDCODED STRINGS. Categories are a real table now
              (`GET /feed/categories`), a video may carry up to three, and the wire takes IDS —
              the free-text `video.category` column those strings wrote to is deprecated and
              nothing reads it. This is also the control that decides which chip and which tile
              a video appears under on the homepage.
            */}
            <CategoryMultiSelect
              selectedCategoryIds={draft.categoryIds}
              onCategoryToggle={handleCategoryToggle}
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
