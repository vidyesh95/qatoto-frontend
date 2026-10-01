import type { StudioStageBadge, StudioVideoType } from "@/lib/videos/studio-view";

export const TITLE_MAXIMUM_LENGTH = 100;
export const TAGS_MAXIMUM_LENGTH = 500;

export const VIDEO_TYPE_OPTIONS: Array<{ value: StudioVideoType; label: string }> = [
  { value: "pitch", label: "Pitch" },
  { value: "demo", label: "Demo" },
  { value: "update", label: "Update" },
  { value: "ama", label: "AMA" },
];

export const SECTOR_TAG_OPTIONS = [
  "AI",
  "Fintech",
  "Health",
  "Climate",
  "EdTech",
  "SaaS",
  "Robotics",
  "Commerce",
];

export const STAGE_BADGE_OPTIONS: Array<{ value: StudioStageBadge; label: string }> = [
  { value: "idea", label: "Idea" },
  { value: "mvp", label: "MVP" },
  { value: "scaling", label: "Scaling" },
  { value: "shipped", label: "Shipped" },
];

export const VIDEO_LANGUAGE_OPTIONS = ["English", "Hindi", "Japanese", "Spanish", "German"];
export const CAPTION_CERTIFICATION_OPTIONS = [
  "None",
  "Has never aired on television in the U.S.",
  "Has only aired on television with captions",
];
export const COMMENT_MODERATION_OPTIONS = ["None", "Basic", "Strict", "Hold all"];
export const COMMENT_SORT_OPTIONS = ["Top", "Newest"];
