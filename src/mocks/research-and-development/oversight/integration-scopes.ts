import type { IntegrationProviderKey, IntegrationScope } from "@/types/research-and-development";

// Scope catalogues shared by every project's oversight fixture. A scope with no
// stated purpose is not informed consent, so every entry names what Qatoto does
// with the permission in plain language — the consent screen renders these
// verbatim rather than showing raw OAuth strings.
export const INTEGRATION_SCOPES_BY_PROVIDER: Record<IntegrationProviderKey, IntegrationScope[]> = {
  github: [
    {
      key: "repo:commits",
      displayLabel: "Read commit metadata",
      purposeNote:
        "Timestamps, authorship and message text ground an effort claim. Source code is never read or stored.",
      isRequired: true,
    },
    {
      key: "repo:pulls",
      displayLabel: "Read pull requests and reviews",
      purposeNote: "A merged review is the strongest single receipt for a claimed working session.",
      isRequired: true,
    },
    {
      key: "repo:issues",
      displayLabel: "Read issues",
      purposeNote: "Links a claim to the work item it moved. Optional — claims verify without it.",
      isRequired: false,
    },
  ],
  gitlab: [
    {
      key: "read_api:commits",
      displayLabel: "Read commit metadata",
      purposeNote: "Same grounding as GitHub commits; file contents are never fetched.",
      isRequired: true,
    },
    {
      key: "read_api:merge_requests",
      displayLabel: "Read merge requests",
      purposeNote: "Merge events anchor the temporal analysis step of a verification run.",
      isRequired: true,
    },
  ],
  jira: [
    {
      key: "read:issue",
      displayLabel: "Read issue transitions",
      purposeNote: "A ticket moving to Done inside the claimed window is a digital receipt.",
      isRequired: true,
    },
    {
      key: "read:worklog",
      displayLabel: "Read work logs",
      purposeNote: "Cross-checks logged minutes against the claim. Optional.",
      isRequired: false,
    },
  ],
  linear: [
    {
      key: "read:issues",
      displayLabel: "Read issues and state changes",
      purposeNote: "State transitions inside the claim window ground the substance analysis step.",
      isRequired: true,
    },
  ],
  figma: [
    {
      key: "files:read",
      displayLabel: "Read file version history",
      purposeNote:
        "Version timestamps evidence design work that leaves no commits. Frame contents are not stored.",
      isRequired: true,
    },
  ],
  google_drive: [
    {
      key: "drive.metadata.readonly",
      displayLabel: "Read document revision metadata",
      purposeNote:
        "Revision timestamps evidence writing and spreadsheet work. Document contents are never read.",
      isRequired: true,
    },
  ],
};

export const INTEGRATION_PROVIDER_LABELS: Record<IntegrationProviderKey, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  jira: "Jira",
  linear: "Linear",
  figma: "Figma",
  google_drive: "Google Drive",
};
