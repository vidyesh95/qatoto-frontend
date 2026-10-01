"use client";

import { useState } from "react";
import type { StudioVideoType, UploadDraft } from "@/lib/videos/studio-view";
import ThumbnailPicker from "@/components/studio/upload/thumbnail-picker";
import { MAX_CATEGORIES_PER_VIDEO } from "@/lib/videos/studio-view";
import {
  DetailsAudienceSection,
  DetailsLinksSection,
  DetailsPlaylistsSection,
  DetailsShowMoreSection,
  PillOptionGroup,
  SelectablePill,
} from "./details-step-subcomponents";
import {
  SECTOR_TAG_OPTIONS,
  STAGE_BADGE_OPTIONS,
  TITLE_MAXIMUM_LENGTH,
  VIDEO_TYPE_OPTIONS,
} from "./details-step-constants";

type DetailsStepProps = {
  readonly draft: UploadDraft;
  readonly onDraftChange: (patch: Partial<UploadDraft>) => void;
  readonly onOpenPlaylistsPicker: () => void;
  /** The saved thumbnail in edit mode, so the picker previews it instead of YouTube's. */
  readonly currentThumbnailUrl?: string | null;
  readonly selectedThumbnailFile: File | null;
  readonly onThumbnailFileSelected: (file: File | null) => void;
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
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
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
            className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
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

        <ThumbnailPicker
          youtubeUrl={draft.youtubeUrl}
          currentThumbnailUrl={currentThumbnailUrl}
          selectedFile={selectedThumbnailFile}
          onFileSelected={onThumbnailFileSelected}
        />
      </section>

      <DetailsLinksSection draft={draft} onDraftChange={onDraftChange} />

      <DetailsPlaylistsSection
        selectedPlaylistIds={draft.selectedPlaylistIds}
        onOpenPlaylistsPicker={onOpenPlaylistsPicker}
      />

      <DetailsAudienceSection
        isMadeForKids={draft.isMadeForKids}
        hasAgeRestriction={draft.hasAgeRestriction}
        isAgeRestrictionSectionOpen={isAgeRestrictionSectionOpen}
        onToggleAgeRestrictionOpen={() =>
          setIsAgeRestrictionSectionOpen(!isAgeRestrictionSectionOpen)
        }
        onDraftChange={onDraftChange}
      />

      <DetailsShowMoreSection
        draft={draft}
        isShowMoreSectionOpen={isShowMoreSectionOpen}
        onToggleShowMoreOpen={() => setIsShowMoreSectionOpen(!isShowMoreSectionOpen)}
        onDraftChange={onDraftChange}
        onCategoryToggle={handleCategoryToggle}
      />
    </div>
  );
}
