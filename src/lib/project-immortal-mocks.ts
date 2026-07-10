// Mock Project Immortal data (research branches, papers, informal posts,
// discussion, product opportunities, contributors) for the UI-building phase.
// Kept out of research-and-development-mocks.ts only for file size — same
// convention: fixtures, no getters.

import type {
  ImmortalCompensationPreference,
  ImmortalContributor,
  ImmortalContributorRole,
  ImmortalIdea,
  ImmortalInformalPost,
  ImmortalPaperCategory,
  ImmortalProductOpportunity,
  ImmortalProgramStat,
  ImmortalResearchBranch,
  ImmortalResearchPaper,
} from "@/types/research-and-development";

// The root of the research flowchart — the branch map selects it by default.
export const PROJECT_IMMORTAL_ROOT_BRANCH_ID = "branch-hallmarks-of-aging";

export const IMMORTAL_PAPER_CATEGORY_LABELS: Record<ImmortalPaperCategory, string> = {
  "longevity-biology": "Longevity Biology",
  "cellular-reprogramming": "Cellular Reprogramming",
  "ai-drug-discovery": "AI Drug Discovery",
  "organ-regeneration": "Organ Regeneration",
  "ethics-and-society": "Ethics & Society",
};

export const IMMORTAL_CONTRIBUTOR_ROLE_LABELS: Record<ImmortalContributorRole, string> = {
  researcher: "Researcher",
  "founder-director": "Founder & Director",
  "venture-capitalist": "Venture Capitalist",
  supplier: "Supplier",
  supporter: "Supporter",
};

export const IMMORTAL_COMPENSATION_PREFERENCE_LABELS: Record<
  ImmortalCompensationPreference,
  string
> = {
  salary: "Salary",
  "one-time": "One-time",
  equity: "Equity",
};

export const MOCK_IMMORTAL_PROGRAM_STATS: ImmortalProgramStat[] = [
  { id: "stat-contributors", statValue: "2,847", statLabel: "Contributing netizens" },
  { id: "stat-papers", statValue: "312", statLabel: "Research papers" },
  { id: "stat-branches", statValue: "38", statLabel: "Research branches" },
  { id: "stat-compensation-pool", statValue: "$4.2M", statLabel: "Compensation pool escrowed" },
];

// Flowchart nodes. leftPercent is authored by depth (root ~12, depth-1 ~36,
// depth-2 ~68) so the tree reads left to right; topPercent spaces siblings.
// Nodes are center-anchored and up to 144px wide (max-w-36) on a 720px-wide
// canvas, so keep leftPercent >= 10 and topPercent within 12–90, or the node
// clips against the edge of the scroll container.
export const MOCK_IMMORTAL_RESEARCH_BRANCHES: ImmortalResearchBranch[] = [
  {
    id: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    parentBranchId: null,
    title: "Hallmarks of Aging",
    summary:
      "The shared trunk of the program: the cellular and molecular processes that drive aging, and which of them are reversible.",
    status: "active",
    contributorCount: 412,
    discussionCount: 138,
    overlappingGroupCount: 1,
    canvasPosition: { leftPercent: 12, topPercent: 50 },
    recentThreadTitles: [
      "Which hallmark should Qatoto fund first?",
      "Are the twelve hallmarks still the right frame in 2026?",
    ],
  },
  {
    id: "branch-cellular-reprogramming",
    parentBranchId: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    title: "Cellular Reprogramming",
    summary:
      "Partial Yamanaka-factor reprogramming to reset epigenetic age without losing cell identity.",
    status: "active",
    contributorCount: 186,
    discussionCount: 74,
    overlappingGroupCount: 3,
    canvasPosition: { leftPercent: 36, topPercent: 16 },
    recentThreadTitles: [
      "OSK vs OSKM: what the mouse data actually shows",
      "Dosing windows that avoid teratoma risk",
      "Can we pool the three overlapping reprogramming teams?",
    ],
  },
  {
    id: "branch-senescent-cell-clearance",
    parentBranchId: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    title: "Senescent-Cell Clearance",
    summary:
      "Senolytics and senomorphics that clear or quiet the zombie cells driving chronic inflammation.",
    status: "active",
    contributorCount: 154,
    discussionCount: 61,
    overlappingGroupCount: 2,
    canvasPosition: { leftPercent: 36, topPercent: 38 },
    recentThreadTitles: [
      "Dasatinib + quercetin: replication status across labs",
      "Do we have a clean senescence biomarker yet?",
    ],
  },
  {
    id: "branch-organ-replacement",
    parentBranchId: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    title: "Organ Replacement",
    summary:
      "Growing, printing, and preserving replacement organs so failure of one system stops being fatal.",
    status: "emerging",
    contributorCount: 97,
    discussionCount: 42,
    overlappingGroupCount: 1,
    canvasPosition: { leftPercent: 36, topPercent: 62 },
    recentThreadTitles: [
      "Decellularized scaffolds vs full bioprinting",
      "Why cold-chain logistics is the real bottleneck",
    ],
  },
  {
    id: "branch-ai-drug-discovery",
    parentBranchId: PROJECT_IMMORTAL_ROOT_BRANCH_ID,
    title: "AI Drug Discovery",
    summary:
      "Models that screen geroprotective compounds and predict which combinations extend healthspan.",
    status: "active",
    contributorCount: 231,
    discussionCount: 89,
    overlappingGroupCount: 4,
    canvasPosition: { leftPercent: 36, topPercent: 84 },
    recentThreadTitles: [
      "Open-weights model for compound screening?",
      "Four groups are training on the same assay set — merge?",
    ],
  },
  {
    id: "branch-reprogramming-safety-gap",
    parentBranchId: "branch-cellular-reprogramming",
    title: "Long-term reprogramming safety data",
    summary:
      "Nobody has published multi-year safety follow-up on partial reprogramming in large mammals. Qatoto flagged this as a blocking gap.",
    status: "missing",
    contributorCount: 0,
    discussionCount: 18,
    overlappingGroupCount: 0,
    canvasPosition: { leftPercent: 68, topPercent: 12 },
    recentThreadTitles: [
      "Who has a primate colony willing to run a 5-year arm?",
      "What would a minimum viable safety protocol look like?",
    ],
  },
  {
    id: "branch-epigenetic-clocks",
    parentBranchId: "branch-cellular-reprogramming",
    title: "Epigenetic Clocks",
    summary:
      "Methylation clocks that measure biological age — the instrument every other branch needs to prove it works.",
    status: "contested",
    contributorCount: 143,
    discussionCount: 96,
    overlappingGroupCount: 2,
    canvasPosition: { leftPercent: 68, topPercent: 24 },
    recentThreadTitles: [
      "Clocks disagree by 8 years on the same sample",
      "Is second-generation clock validation circular?",
    ],
  },
  {
    id: "branch-senolytic-trials",
    parentBranchId: "branch-senescent-cell-clearance",
    title: "Human Senolytic Trials",
    summary: "Phase I/II human trials of intermittent senolytic dosing in age-related fibrosis.",
    status: "active",
    contributorCount: 68,
    discussionCount: 33,
    overlappingGroupCount: 1,
    canvasPosition: { leftPercent: 68, topPercent: 40 },
    recentThreadTitles: [
      "Recruiting a 200-person cohort through Qatoto",
      "Endpoint selection: function or biomarker?",
    ],
  },
  {
    id: "branch-south-asian-biomarkers-gap",
    parentBranchId: "branch-senescent-cell-clearance",
    title: "Aging biomarkers for South-Asian cohorts",
    summary:
      "Nearly all aging biomarker panels were trained on European cohorts. Qatoto highlighted the missing data — the results may not transfer.",
    status: "missing",
    contributorCount: 0,
    discussionCount: 27,
    overlappingGroupCount: 0,
    canvasPosition: { leftPercent: 68, topPercent: 56 },
    recentThreadTitles: [
      "Which Indian and Bangladeshi cohorts already exist?",
      "Funding a 5,000-sample methylation panel",
    ],
  },
  {
    id: "branch-organ-preservation",
    parentBranchId: "branch-organ-replacement",
    title: "Organ Preservation",
    summary:
      "Vitrification and machine perfusion that stretch the viable window from hours to days.",
    status: "emerging",
    contributorCount: 54,
    discussionCount: 21,
    overlappingGroupCount: 2,
    canvasPosition: { leftPercent: 68, topPercent: 72 },
    recentThreadTitles: [
      "Ice-blocker cocktails that survive rewarming",
      "Two teams built the same perfusion rig — share the BOM?",
    ],
  },
  {
    id: "branch-compound-screening",
    parentBranchId: "branch-ai-drug-discovery",
    title: "Geroprotector Screening",
    summary:
      "High-throughput in-silico screens ranking known compounds by predicted healthspan effect.",
    status: "active",
    contributorCount: 119,
    discussionCount: 45,
    overlappingGroupCount: 1,
    canvasPosition: { leftPercent: 68, topPercent: 90 },
    recentThreadTitles: [
      "Top 50 ranked compounds, open dataset",
      "Wet-lab partners wanted for hit validation",
    ],
  },
];

export const MOCK_IMMORTAL_PRODUCT_OPPORTUNITIES: ImmortalProductOpportunity[] = [
  {
    id: "product-senolytic-line",
    productName: "Senolytic supplement line",
    productDescription:
      "Intermittent-dosing formulations sold through the Qatoto store once trial endpoints clear.",
    derivedFromBranchTitle: "Human Senolytic Trials",
    marketPotentialLabel: "$12B est. market",
    readinessLabel: "Monetizable in 2–4 yrs",
  },
  {
    id: "product-epigenetic-test-kit",
    productName: "Epigenetic age home test kit",
    productDescription:
      "Mail-in saliva kit returning a biological-age readout and a healthspan action plan.",
    derivedFromBranchTitle: "Epigenetic Clocks",
    marketPotentialLabel: "$3.4B est. market",
    readinessLabel: "Monetizable in 1–2 yrs",
  },
  {
    id: "product-organ-transport-unit",
    productName: "Organ preservation transport unit",
    productDescription:
      "Machine-perfusion cold-chain hardware that stretches the transplant window to days.",
    derivedFromBranchTitle: "Organ Preservation",
    marketPotentialLabel: "$1.8B est. market",
    readinessLabel: "Monetizable in 3–5 yrs",
  },
  {
    id: "product-screening-platform",
    productName: "Geroprotector screening platform",
    productDescription:
      "Licensed model access for labs ranking compound libraries before touching a pipette.",
    derivedFromBranchTitle: "Geroprotector Screening",
    marketPotentialLabel: "$740M est. market",
    readinessLabel: "Monetizable now",
  },
];

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

export const MOCK_IMMORTAL_INFORMAL_POSTS: ImmortalInformalPost[] = [
  {
    id: "informal-aging-clinics-as-gyms",
    title: "What if we treated aging clinics like gyms?",
    authorName: "Marcus Bell",
    authorAvatarSrc: "/dummy/profile_image_03.avif",
    postedAtLabel: "2 days ago",
    bodyText:
      "No proof, just a hunch. Everybody accepts a monthly gym fee for muscle they can see. Nobody pays monthly for a mitochondrial checkup they can't. If a clinic gave you a biological-age number every month, the number itself becomes the treadmill. Behavior change is the cheapest longevity intervention we have and we keep skipping straight to molecules.",
    reactionCountLabel: "418",
    replyCountLabel: "37",
  },
  {
    id: "informal-n-of-one-clock",
    title: "My n=1 epigenetic clock experiment, month 6",
    authorName: "Lena Fischer",
    authorAvatarSrc: "/dummy/profile_image_07.avif",
    postedAtLabel: "5 days ago",
    bodyText:
      "Six monthly methylation tests, same lab, same time of day. My biological age bounced 4 years in both directions with no lifestyle change big enough to explain it. Either the clocks are noisy at the individual level or something seasonal is going on. Posting the raw CSV in the thread — somebody with real statistics chops please tear this apart.",
    reactionCountLabel: "692",
    replyCountLabel: "104",
  },
  {
    id: "informal-repair-not-slow",
    title: "We keep trying to slow aging when we should be repairing it",
    authorName: "Tobias Nkemelu",
    authorAvatarSrc: "/dummy/profile_image_05.avif",
    postedAtLabel: "1 week ago",
    bodyText:
      "Slowing damage buys years. Repairing damage buys decades, and it works on people who are already old — which is everyone reading this. The whole field's funding still skews toward slowing. I think that's a category error we inherited from calorie-restriction studies.",
    reactionCountLabel: "1,203",
    replyCountLabel: "217",
  },
  {
    id: "informal-open-hardware-perfusion",
    title: "An open-hardware perfusion rig would unblock three branches at once",
    authorName: "Sofia Almeida",
    authorAvatarSrc: "/dummy/profile_image_11.avif",
    postedAtLabel: "2 weeks ago",
    bodyText:
      "Two teams on the map built the same machine-perfusion rig, independently, for about $40K each. Publish the bill of materials, let a Qatoto supplier assemble it at volume, and organ preservation stops being a hardware problem. This is exactly the kind of overlap the branch map should be catching earlier.",
    reactionCountLabel: "534",
    replyCountLabel: "62",
  },
];

export const MOCK_IMMORTAL_IDEAS: ImmortalIdea[] = [
  {
    id: "idea-caloric-restriction-mimetics",
    authorName: "Ravi Deshmukh",
    authorAvatarSrc: "/dummy/profile_image_01.avif",
    authorLocation: "Pune, India",
    postedAtLabel: "4 hours ago",
    ideaText:
      "Caloric restriction works in every model organism we've tried and almost nobody can stick to it. A mimetic that triggers the same pathways without the hunger would be the single highest-leverage intervention on this whole map. Why is this not branch number one?",
    likeCountLabel: "482",
    replies: [
      {
        id: "reply-crm-rapamycin",
        authorName: "Dr. Amara Okafor",
        authorAvatarSrc: "/dummy/profile_image_02.avif",
        postedAtLabel: "3 hours ago",
        replyText:
          "It partly is — rapamycin and metformin both sit under AI Drug Discovery. The hard part isn't finding mimetics, it's proving healthspan benefit in humans without a 30-year trial.",
        likeCountLabel: "214",
      },
      {
        id: "reply-crm-endpoints",
        authorName: "Lena Fischer",
        authorAvatarSrc: "/dummy/profile_image_07.avif",
        postedAtLabel: "2 hours ago",
        replyText:
          "Which loops back to the epigenetic clock branch. Fix the instrument and every other trial gets 10x cheaper.",
        likeCountLabel: "97",
      },
    ],
  },
  {
    id: "idea-community-clock-testing",
    authorName: "Grace Muthoni",
    authorAvatarSrc: "/dummy/profile_image_04.avif",
    authorLocation: "Nairobi, Kenya",
    postedAtLabel: "Yesterday",
    ideaText:
      "Qatoto could run community epigenetic-clock testing at scale — 10,000 people, five continents, one protocol. Cheap per head, and it fixes the South-Asian and African biomarker gaps the map is already flagging. The crowd is the asset here, not the lab.",
    likeCountLabel: "1,047",
    replies: [
      {
        id: "reply-clock-consent",
        authorName: "Dr. Nadia Haddad",
        authorAvatarSrc: "/dummy/profile_image_06.avif",
        postedAtLabel: "20 hours ago",
        replyText:
          "Consent and data governance have to be designed before sample one. Who owns a methylation profile, and can it ever be sold?",
        likeCountLabel: "331",
      },
      {
        id: "reply-clock-supplier",
        authorName: "Sofia Almeida",
        authorAvatarSrc: "/dummy/profile_image_11.avif",
        postedAtLabel: "16 hours ago",
        replyText:
          "Kit assembly and cold-chain shipping is a supplier problem, and suppliers on Qatoto already do this for the store. Compensation could ride the same escrow.",
        likeCountLabel: "158",
      },
    ],
  },
  {
    id: "idea-plasma-dilution-protocol",
    authorName: "Tobias Nkemelu",
    authorAvatarSrc: "/dummy/profile_image_05.avif",
    authorLocation: "Lagos, Nigeria",
    postedAtLabel: "2 days ago",
    ideaText:
      "Publish an open plasma-dilution protocol. The mouse results are strong, the procedure is already routine in hospitals as therapeutic plasma exchange, and the only reason it hasn't been tested properly is that nobody can patent saline.",
    likeCountLabel: "756",
    replies: [],
  },
  {
    id: "idea-repair-old-first",
    authorName: "Yuki Sato",
    authorAvatarSrc: "/dummy/profile_image_08.avif",
    authorLocation: "Osaka, Japan",
    postedAtLabel: "3 days ago",
    ideaText:
      "Every therapy on this map should be evaluated on people who are already 70. If it only works when started at 30, it's a lifestyle product, not a life-extension one — and we should be honest about which we're building.",
    likeCountLabel: "612",
    replies: [],
  },
  {
    id: "idea-fund-the-gaps",
    authorName: "Marcus Bell",
    authorAvatarSrc: "/dummy/profile_image_03.avif",
    authorLocation: "Manchester, UK",
    postedAtLabel: "6 days ago",
    ideaText:
      "The two dashed nodes on the branch map — long-term safety data and non-European biomarkers — are the least glamorous and most blocking work in the program. Qatoto should route funding to highlighted gaps first, not to whatever branch is trending.",
    likeCountLabel: "389",
    replies: [],
  },
];

export const MOCK_IMMORTAL_CONTRIBUTORS: ImmortalContributor[] = [
  {
    id: "contributor-amara-okafor",
    name: "Dr. Amara Okafor",
    avatarSrc: "/dummy/profile_image_02.avif",
    role: "researcher",
    effortLabel: "412 hrs logged",
    contributionLabel: "Senolytics meta-review, 3 assay datasets",
    compensationPreference: "salary",
  },
  {
    id: "contributor-hiroshi-tanaka",
    name: "Dr. Hiroshi Tanaka",
    avatarSrc: "/dummy/profile_image_10.avif",
    role: "researcher",
    effortLabel: "298 hrs logged",
    contributionLabel: "Primate reprogramming interim results",
    compensationPreference: "equity",
  },
  {
    id: "contributor-priya-raghunathan",
    name: "Priya Raghunathan",
    avatarSrc: "/dummy/profile_image_12.avif",
    role: "researcher",
    effortLabel: "531 hrs logged",
    contributionLabel: "Screening model + open compound dataset",
    compensationPreference: "equity",
  },
  {
    id: "contributor-vidyesh-churi",
    name: "Vidyesh Churi",
    avatarSrc: "/dummy/profile_image_09.avif",
    role: "founder-director",
    effortLabel: "1,204 hrs logged",
    contributionLabel: "Program direction, milestone review, execution oversight",
    compensationPreference: "equity",
  },
  {
    id: "contributor-grace-muthoni",
    name: "Grace Muthoni",
    avatarSrc: "/dummy/profile_image_04.avif",
    role: "founder-director",
    effortLabel: "687 hrs logged",
    contributionLabel: "Cohort operations across 5 continents",
    compensationPreference: "salary",
  },
  {
    id: "contributor-northline-capital",
    name: "Northline Capital",
    avatarSrc: "/dummy/profile_image_06.avif",
    role: "venture-capitalist",
    effortLabel: "Funding tranche 2 of 4",
    contributionLabel: "$2.5M escrowed against milestones",
    compensationPreference: "equity",
  },
  {
    id: "contributor-halcyon-fund",
    name: "Halcyon Longevity Fund",
    avatarSrc: "/dummy/profile_image_01.avif",
    role: "venture-capitalist",
    effortLabel: "Funding tranche 1 of 3",
    contributionLabel: "$1.7M escrowed against milestones",
    compensationPreference: "equity",
  },
  {
    id: "contributor-sofia-almeida",
    name: "Sofia Almeida",
    avatarSrc: "/dummy/profile_image_11.avif",
    role: "supplier",
    effortLabel: "142 hrs logged",
    contributionLabel: "Perfusion rig assembly, 24 units shipped",
    compensationPreference: "one-time",
  },
  {
    id: "contributor-kanpur-biolabs",
    name: "Kanpur BioLabs",
    avatarSrc: "/dummy/profile_image_05.avif",
    role: "supplier",
    effortLabel: "89 hrs logged",
    contributionLabel: "Methylation test kits, 5,000-unit run",
    compensationPreference: "one-time",
  },
  {
    id: "contributor-yuki-sato",
    name: "Yuki Sato",
    avatarSrc: "/dummy/profile_image_08.avif",
    role: "supporter",
    effortLabel: "203 hrs logged",
    contributionLabel: "Trial-participant support, 340 tickets resolved",
    compensationPreference: "salary",
  },
  {
    id: "contributor-marcus-bell",
    name: "Marcus Bell",
    avatarSrc: "/dummy/profile_image_03.avif",
    role: "supporter",
    effortLabel: "76 hrs logged",
    contributionLabel: "Kit onboarding walkthroughs and returns handling",
    compensationPreference: "one-time",
  },
];
