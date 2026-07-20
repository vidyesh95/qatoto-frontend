import type { ResearchProject } from "@/types/research-and-development";

export const MODULAR_WATER_PURIFICATION_PROJECT: ResearchProject = {
  id: "modular-water-purification",
  name: "ClearFlow Modular Purification",
  tagline:
    "Stackable arsenic and pathogen filtration units for village water points in South Asia.",
  description:
    "ClearFlow designs a stackable filtration module that bolts onto existing tube wells and community water points, removing arsenic and biological contaminants without electricity. Modules share one molded housing so villages can add capacity as they grow, and spent filter media swaps out in minutes with no tools. The team is validating the problem household by household in Khulna Division before freezing the filter-media mix.",
  category: "Water & Sanitation",
  stage: "problem-validation",
  coverImageSrc: "/dummy/rnd_project_cover_02.avif",
  founderId: "farhana-rahman",
  teamMembers: [
    {
      id: "farhana-rahman",
      name: "Farhana Rahman",
      avatarImageSrc: "/dummy/profile_image_05.avif",
      role: "Founder & Water Engineer",
      skills: ["Filtration chemistry", "WASH programs", "Bengali-language fieldwork"],
      equityShare: "68%",
      effortHoursLogged: 176,
      joinedDate: "Mar 15, 2026",
      isFounder: true,
    },
    {
      id: "arjun-mehta",
      name: "Arjun Mehta",
      avatarImageSrc: "/dummy/profile_image_06.avif",
      role: "Hardware Designer",
      skills: ["Injection molding", "Design for manufacture", "CAD"],
      equityShare: "8%",
      effortHoursLogged: 104,
      joinedDate: "Apr 2, 2026",
    },
    {
      id: "nusrat-jahan",
      name: "Nusrat Jahan",
      avatarImageSrc: "/dummy/profile_image_07.avif",
      role: "Community Research Lead",
      skills: ["Household surveys", "NGO coordination"],
      equityShare: "6%",
      effortHoursLogged: 88,
      joinedDate: "Apr 10, 2026",
    },
  ],
  openRoles: [
    {
      id: "water-role-water-quality-chemist",
      projectId: "modular-water-purification",
      projectName: "ClearFlow Modular Purification",
      roleTitle: "Water Quality Chemist",
      skills: ["Lab assay design", "Arsenic speciation", "Field test kits"],
      compensation: [
        {
          kind: "equity",
          amountLabel: "2–4%",
          earnedAsLabel: "Vests via Slicing Pie as verified effort lands",
        },
      ],
      commitment: "part-time",
    },
  ],
  milestones: [
    {
      id: "water-milestone-contamination-mapping",
      title: "Map contamination levels across 40 tube wells",
      description:
        "Field assays across three unions in Khulna Division to size the affected population and contamination range.",
      targetDate: "Jun 10, 2026",
      status: "done",
      escrowReleaseAmount: "$1,100",
    },
    {
      id: "water-milestone-household-interviews",
      title: "Complete 120 household willingness-to-pay interviews",
      description:
        "Structured interviews on current water-fetching costs, health spending, and acceptable price per module.",
      targetDate: "Jul 21, 2026",
      status: "current",
      escrowReleaseAmount: "$1,400",
    },
    {
      id: "water-milestone-filter-media-selection",
      title: "Select filter media mix from lab candidates",
      description:
        "Bench comparison of iron-oxide and activated-alumina blends against the mapped contamination range.",
      targetDate: "Aug 25, 2026",
      status: "upcoming",
      escrowReleaseAmount: "$1,800",
    },
    {
      id: "water-milestone-village-pilot",
      title: "Install pilot unit at Khulna village water point",
      description: "First full module in daily community use with weekly water-quality sampling.",
      targetDate: "Oct 8, 2026",
      status: "upcoming",
      escrowReleaseAmount: "$2,600",
    },
    {
      id: "water-milestone-certification-plan",
      title: "File national drinking-water certification plan",
      description:
        "Certification pathway agreed with the national standards body, with required test schedule.",
      targetDate: "Nov 20, 2026",
      status: "upcoming",
    },
  ],
  dailyLogs: [
    {
      id: "water-log-jul-7",
      authorId: "nusrat-jahan",
      date: "Jul 7, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image05.avif",
      transcriptExcerpt:
        "Interviewed 14 households in Dumuria today — 89 of 120 done. Families spend more on stomach-illness treatment than our module would cost them in a year.",
      detail:
        "The health-spending finding keeps repeating: an average of 340 taka a month on clinic visits and medicine attributed to water. That reframes the pitch from a purchase to a saving. Three households asked to join the pilot on the spot.",
      aiSummaryChips: [
        { kind: "progress", label: "89 of 120 interviews complete" },
        { kind: "velocity", label: "Interview pace up 20% this week" },
      ],
      isEffortVerified: true,
    },
    {
      id: "water-log-jul-6",
      authorId: "farhana-rahman",
      date: "Jul 6, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image06.avif",
      transcriptExcerpt:
        "The arsenic speciation reagents are stuck at Chattogram customs — that stalls the lab comparison, so I reordered a smaller batch through the university lab's standing import license.",
      detail:
        "Worst case we lose ten days on the filter-media bench tests. The university route has cleared customs in under a week before, and Professor Karim agreed to receive the shipment. I also updated the milestone risk notes for backers.",
      aiSummaryChips: [
        { kind: "blocker", label: "Reagent shipment held at customs" },
        { kind: "suggestion", label: "Route imports via university license" },
      ],
      isEffortVerified: true,
    },
    {
      id: "water-log-jul-5",
      authorId: "arjun-mehta",
      date: "Jul 5, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image07.avif",
      transcriptExcerpt:
        "Revised the housing tooling for a single-cavity mold first — cuts our initial tooling cost by more than half while we are still iterating on wall thickness.",
      detail:
        "The two-cavity mold only pays off past 5,000 units a year, and we will not see that volume before certification. Single-cavity keeps the same part geometry, so nothing downstream changes. Sent the revised quote request to both toolmakers.",
      aiSummaryChips: [{ kind: "progress", label: "Tooling cost cut by half" }],
      isEffortVerified: true,
    },
    {
      id: "water-log-jul-4",
      authorId: "farhana-rahman",
      date: "Jul 4, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image08.avif",
      transcriptExcerpt:
        "Met the BRAC WASH coordinator for Khulna — they want quarterly water-quality data from the pilot and in exchange will introduce us to eleven more village committees.",
      detail:
        "That introduction pipeline is bigger than anything we could build ourselves this year. The data-sharing ask is easy since we planned weekly sampling anyway. Drafted a one-page memorandum for their regional office to review.",
      aiSummaryChips: [
        { kind: "progress", label: "BRAC partnership memorandum drafted" },
        { kind: "suggestion", label: "Publish pilot water data quarterly" },
      ],
      isEffortVerified: true,
    },
  ],
  fundingRounds: [
    {
      id: "water-round-community",
      type: "crowdfunding",
      goalAmount: "$15,000",
      raisedAmount: "$4,900",
      percentageFunded: 33,
      backersCount: 112,
      closesOnDate: "Sep 12, 2026",
      status: "open",
    },
  ],
  escrowLedger: [
    {
      id: "water-escrow-6",
      date: "Jul 5, 2026",
      description: "Backer pledges — week of Jun 29",
      direction: "in",
      amount: "$700",
      verificationStatus: "pending",
    },
    {
      id: "water-escrow-5",
      date: "Jun 26, 2026",
      description: "Backer pledges — week of Jun 22",
      direction: "in",
      amount: "$1,300",
      verificationStatus: "verified",
    },
    {
      id: "water-escrow-4",
      date: "Jun 14, 2026",
      description: "Milestone release — tube-well contamination mapping",
      direction: "out",
      amount: "$1,100",
      linkedMilestoneId: "water-milestone-contamination-mapping",
      verificationStatus: "verified",
    },
    {
      id: "water-escrow-3",
      date: "Jun 12, 2026",
      description: "Backer pledges — week of Jun 8",
      direction: "in",
      amount: "$1,100",
      verificationStatus: "verified",
    },
    {
      id: "water-escrow-2",
      date: "May 30, 2026",
      description: "Backer pledges — week of May 25",
      direction: "in",
      amount: "$1,000",
      verificationStatus: "verified",
    },
    {
      id: "water-escrow-1",
      date: "May 18, 2026",
      description: "Community round opening deposits",
      direction: "in",
      amount: "$800",
      verificationStatus: "verified",
    },
  ],
  watchersCount: 156,
  dailyLogStreakDays: 7,
  relatedInsightIds: ["insight-water-access-gap", "insight-solar-hardware-costs"],
};
