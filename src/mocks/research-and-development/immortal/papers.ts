// Mock Project Immortal research papers. Split out of
// project-immortal-mocks.ts only for file size — same convention: fixtures,
// no getters.

import type { ImmortalResearchPaper } from "@/types/research-and-development";

export const MOCK_IMMORTAL_RESEARCH_PAPERS: ImmortalResearchPaper[] = [
  {
    id: "paper-senolytics-meta-review",
    title: "Senolytic Compounds and Healthspan: A Meta-Review of 2020–2026 Trials",
    authorName: "Dr. Amara Okafor",
    authorAffiliation: "University of Lagos, Gerontology Lab",
    category: "longevity-biology",
    fileSizeLabel: "3.1 MB",
    uploadedDateLabel: "Jun 28, 2026",
  },
  {
    id: "paper-partial-reprogramming-primates",
    title: "Partial Reprogramming in Non-Human Primates: 18-Month Interim Results",
    authorName: "Dr. Hiroshi Tanaka",
    authorAffiliation: "Kyoto Institute for Regenerative Medicine",
    category: "cellular-reprogramming",
    fileSizeLabel: "5.6 MB",
    uploadedDateLabel: "Jun 14, 2026",
  },
  {
    id: "paper-geroprotector-ranking",
    title: "Ranking 4,200 Geroprotector Candidates with a Transformer Screening Model",
    authorName: "Priya Raghunathan",
    authorAffiliation: "Qatoto Open Research Collective",
    category: "ai-drug-discovery",
    fileSizeLabel: "2.4 MB",
    uploadedDateLabel: "May 30, 2026",
  },
  {
    id: "paper-vitrification-rewarming",
    title: "Nanowarming of Vitrified Kidneys Without Ice Nucleation Damage",
    authorName: "Dr. Elena Vasquez",
    authorAffiliation: "Barcelona Organ Preservation Group",
    category: "organ-regeneration",
    fileSizeLabel: "4.2 MB",
    uploadedDateLabel: "May 12, 2026",
  },
  {
    id: "paper-clock-disagreement",
    title: "Why Epigenetic Clocks Disagree: A Cross-Cohort Calibration Study",
    authorName: "Dr. Samuel Adeyemi",
    authorAffiliation: "Imperial College London",
    category: "longevity-biology",
    fileSizeLabel: "1.9 MB",
    uploadedDateLabel: "Apr 27, 2026",
  },
  {
    id: "paper-access-and-equity",
    title: "Who Gets to Live Longer? Access and Equity in Life-Extension Therapies",
    authorName: "Dr. Nadia Haddad",
    authorAffiliation: "American University of Beirut, Bioethics",
    category: "ethics-and-society",
    fileSizeLabel: "820 KB",
    uploadedDateLabel: "Apr 09, 2026",
  },
];
