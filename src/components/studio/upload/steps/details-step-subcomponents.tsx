"use client";

import Image from "next/image";
import type React from "react";
import type { UploadDraft } from "@/lib/videos/studio-view";
import { useFeedCategoriesQuery } from "@/hooks/feed/queries";
import { useMyPlaylistsQuery } from "@/hooks/playlists";
import { MAX_CATEGORIES_PER_VIDEO } from "@/lib/videos/studio-view";
import { SelectField as LabeledSelect } from "@/components/studio/upload/select-field";

import {
  CAPTION_CERTIFICATION_OPTIONS,
  COMMENT_MODERATION_OPTIONS,
  COMMENT_SORT_OPTIONS,
  TAGS_MAXIMUM_LENGTH,
  VIDEO_LANGUAGE_OPTIONS,
} from "./details-step-constants";

export function SelectablePill({
  label,
  isSelected,
  onClick,
}: {
  readonly label: string;
  readonly isSelected: boolean;
  readonly onClick: () => void;
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

export function PillOptionGroup({
  groupLabel,
  helperText,
  children,
}: {
  readonly groupLabel: string;
  readonly helperText?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{groupLabel}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}

export function CheckboxRow({
  label,
  isChecked,
  onToggle,
}: {
  readonly label: string;
  readonly isChecked: boolean;
  readonly onToggle: () => void;
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

export function CollapsibleSectionToggle({
  label,
  isOpen,
  onToggle,
}: {
  readonly label: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
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

export function LabeledTextInput({
  fieldId,
  label,
  value,
  placeholder,
  onValueChange,
}: {
  readonly fieldId: string;
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly onValueChange: (value: string) => void;
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
        className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
      />
    </div>
  );
}

export function CategoryMultiSelect({
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
        (() => {
          const selectedCategoryIdsSet = new Set(selectedCategoryIds);
          return (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = selectedCategoryIdsSet.has(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onCategoryToggle(category.id)}
                    aria-pressed={isSelected}
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
          );
        })()
      )}
    </div>
  );
}

export function SelectedPlaylistNames({
  selectedPlaylistIds,
}: {
  readonly selectedPlaylistIds: string[];
}) {
  const playlistsQuery = useMyPlaylistsQuery({ limit: 100 });
  if (selectedPlaylistIds.length === 0) return null;

  const selectedPlaylistIdsSet = new Set(selectedPlaylistIds);
  const selectedTitles = (playlistsQuery.data?.rows ?? [])
    .filter((playlist) => selectedPlaylistIdsSet.has(playlist.id))
    .map((playlist) => playlist.title);

  return (
    <p className="text-xs text-muted-foreground">
      {selectedTitles.length > 0
        ? selectedTitles.join(" · ")
        : `${selectedPlaylistIds.length} selected`}
    </p>
  );
}

export function DetailsLinksSection({
  draft,
  onDraftChange,
}: {
  readonly draft: UploadDraft;
  readonly onDraftChange: (patch: Partial<UploadDraft>) => void;
}) {
  return (
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
  );
}

export function DetailsPlaylistsSection({
  selectedPlaylistIds,
  onOpenPlaylistsPicker,
}: {
  readonly selectedPlaylistIds: string[];
  readonly onOpenPlaylistsPicker: () => void;
}) {
  const playlistsTriggerLabel =
    selectedPlaylistIds.length === 0
      ? "Select playlists"
      : `${selectedPlaylistIds.length} playlist${
          selectedPlaylistIds.length === 1 ? "" : "s"
        } selected`;

  return (
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
      <SelectedPlaylistNames selectedPlaylistIds={selectedPlaylistIds} />
    </section>
  );
}

export function DetailsAudienceSection({
  isMadeForKids,
  hasAgeRestriction,
  isAgeRestrictionSectionOpen,
  onToggleAgeRestrictionOpen,
  onDraftChange,
}: {
  readonly isMadeForKids: boolean | null;
  readonly hasAgeRestriction: boolean;
  readonly isAgeRestrictionSectionOpen: boolean;
  readonly onToggleAgeRestrictionOpen: () => void;
  readonly onDraftChange: (patch: Partial<UploadDraft>) => void;
}) {
  return (
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
          isSelected={isMadeForKids === true}
          onClick={() => onDraftChange({ isMadeForKids: true })}
        />
        <SelectablePill
          label="No, it's not made for kids"
          isSelected={isMadeForKids === false}
          onClick={() => onDraftChange({ isMadeForKids: false })}
        />
      </div>

      <CollapsibleSectionToggle
        label="Age restriction (advanced)"
        isOpen={isAgeRestrictionSectionOpen}
        onToggle={onToggleAgeRestrictionOpen}
      />
      {isAgeRestrictionSectionOpen && (
        <CheckboxRow
          label="Restrict my video to viewers over 18"
          isChecked={hasAgeRestriction}
          onToggle={() => onDraftChange({ hasAgeRestriction: !hasAgeRestriction })}
        />
      )}
    </section>
  );
}

export function DetailsShowMoreSection({
  draft,
  isShowMoreSectionOpen,
  onToggleShowMoreOpen,
  onDraftChange,
  onCategoryToggle,
}: {
  readonly draft: UploadDraft;
  readonly isShowMoreSectionOpen: boolean;
  readonly onToggleShowMoreOpen: () => void;
  readonly onDraftChange: (patch: Partial<UploadDraft>) => void;
  readonly onCategoryToggle: (categoryId: string) => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
      <CollapsibleSectionToggle
        label="Show more"
        isOpen={isShowMoreSectionOpen}
        onToggle={onToggleShowMoreOpen}
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
              className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
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
                className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary-imprint"
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

          <CategoryMultiSelect
            selectedCategoryIds={draft.categoryIds}
            onCategoryToggle={onCategoryToggle}
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
  );
}
