import type { ResearchProject } from "@/types/research-and-development";

export const SOLAR_COLD_STORAGE_PROJECT: ResearchProject = {
  id: "solar-cold-storage",
  name: "SolarChill Cold Storage",
  tagline: "Solar-powered walk-in cold rooms for smallholder produce markets in East Africa.",
  description:
    "SolarChill builds pay-per-crate cold rooms at produce aggregation points between Nakuru farms and Nairobi wholesale markets. Each unit pairs locally serviceable vapor-compression refrigeration with an oversized solar array and thermal storage, so vendors keep produce fresh through multi-day grid outages without diesel. The team is currently sizing demand: how many crates per market, at what price per night, and which cooperatives will anchor the first three sites.",
  category: "Cold Chain",
  stage: "market-research",
  coverImageSrc: "/dummy/rnd_project_cover_01.avif",
  founderId: "wanjiru-kamau",
  teamMembers: [
    {
      id: "wanjiru-kamau",
      name: "Wanjiru Kamau",
      avatarImageSrc: "/dummy/profile_image_01.avif",
      role: "Founder & Product Lead",
      skills: ["Agricultural supply chains", "Field research", "Partnership development"],
      equityShare: "62%",
      effortHoursLogged: 148,
      joinedDate: "Apr 6, 2026",
      isFounder: true,
    },
    {
      id: "daniel-otieno",
      name: "Daniel Otieno",
      avatarImageSrc: "/dummy/profile_image_02.avif",
      role: "Refrigeration Engineer",
      skills: ["Vapor-compression systems", "Solar PV sizing", "CAD"],
      equityShare: "9%",
      effortHoursLogged: 96,
      joinedDate: "Apr 20, 2026",
    },
    {
      id: "grace-muthoni",
      name: "Grace Muthoni",
      avatarImageSrc: "/dummy/profile_image_03.avif",
      role: "Market Researcher",
      skills: ["Survey design", "Swahili-language interviews", "Data analysis"],
      equityShare: "5.5%",
      effortHoursLogged: 82,
      joinedDate: "May 4, 2026",
    },
    {
      id: "samuel-kiprop",
      name: "Samuel Kiprop",
      avatarImageSrc: "/dummy/profile_image_04.avif",
      role: "Field Operations",
      skills: ["Logistics", "Vendor relations"],
      equityShare: "4%",
      effortHoursLogged: 61,
      joinedDate: "May 18, 2026",
    },
  ],
  openRoles: [
    {
      id: "solar-role-cooling-systems-engineer",
      projectId: "solar-cold-storage",
      projectName: "SolarChill Cold Storage",
      roleTitle: "Cooling Systems Engineer",
      skills: ["Thermal modeling", "Off-grid power", "Prototyping"],
      compensation: [
        {
          kind: "salary",
          amountLabel: "$4k–6k/mo",
          earnedAsLabel: "Paid from milestone escrow as logged work verifies",
        },
        {
          kind: "equity",
          amountLabel: "3–6%",
          earnedAsLabel: "Vests via Slicing Pie as verified effort lands",
        },
      ],
      commitment: "full-time",
    },
  ],
  milestones: [
    {
      id: "solar-milestone-demand-survey",
      title: "Complete 400-vendor demand survey",
      description:
        "Structured interviews across four Nakuru-corridor markets on spoilage rates and willingness to pay per crate-night.",
      targetDate: "Jun 20, 2026",
      status: "done",
      escrowReleaseAmount: "$600",
    },
    {
      id: "solar-milestone-cost-model",
      title: "Publish landed-cost model per cold room",
      description:
        "Full bill of materials, import duties, and installation labor for one 20-crate unit, priced against diesel alternatives.",
      targetDate: "Jul 18, 2026",
      status: "current",
      escrowReleaseAmount: "$1,200",
    },
    {
      id: "solar-milestone-pilot-sites",
      title: "Sign letters of intent with 3 pilot market cooperatives",
      description:
        "Anchor cooperatives commit floor space and a minimum nightly crate volume for the first season.",
      targetDate: "Aug 22, 2026",
      status: "upcoming",
      escrowReleaseAmount: "$1,500",
    },
    {
      id: "solar-milestone-prototype-spec",
      title: "Freeze v1 cold-room engineering spec",
      description:
        "Refrigeration loop, panel array, and thermal-storage sizing locked for the pilot build.",
      targetDate: "Sep 30, 2026",
      status: "upcoming",
      escrowReleaseAmount: "$2,000",
    },
    {
      id: "solar-milestone-first-build",
      title: "Assemble first cold room at Nakuru pilot site",
      description: "On-site assembly, commissioning, and a two-week loaded temperature trial.",
      targetDate: "Nov 15, 2026",
      status: "upcoming",
    },
  ],
  dailyLogs: [
    {
      id: "solar-log-jul-7",
      authorId: "grace-muthoni",
      date: "Jul 7, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image01.avif",
      transcriptExcerpt:
        "Closed out 46 more vendor interviews today at Wakulima market — that puts us at 312 of the 400 target, and the spoilage numbers keep landing between 28 and 35 percent.",
      detail:
        "The afternoon batch skewed toward leafy-green sellers, who report the worst overnight losses. Willingness to pay clusters around 25 shillings per crate-night, higher than our model assumed. Two vendors volunteered to be reference customers for the pilot.",
      aiSummaryChips: [
        { kind: "progress", label: "312 of 400 surveys complete" },
        { kind: "velocity", label: "Ahead of weekly interview target" },
      ],
      isEffortVerified: false,
    },
    {
      id: "solar-log-jul-6",
      authorId: "daniel-otieno",
      date: "Jul 6, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image02.avif",
      transcriptExcerpt:
        "The compressor quote from the Nairobi distributor slipped another three weeks, which pushes the cost model — I spent the day pricing an alternative supplier in Mombasa.",
      detail:
        "The Mombasa supplier stocks a comparable R290 compressor at 8% higher unit cost but with two-week delivery and a local service agent. I drafted both options into the landed-cost spreadsheet so Wanjiru can decide before Friday.",
      aiSummaryChips: [
        { kind: "blocker", label: "Compressor quote delayed 3 weeks" },
        { kind: "suggestion", label: "Evaluate Mombasa supplier alternative" },
      ],
      isEffortVerified: true,
    },
    {
      id: "solar-log-jul-5",
      authorId: "wanjiru-kamau",
      date: "Jul 5, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image03.avif",
      transcriptExcerpt:
        "Good day — the Nakuru West cooperative board agreed to a formal sit-down on the 15th, and they are bringing the two neighboring market committees with them.",
      detail:
        "If that meeting lands, all three pilot letters of intent could come from one negotiation. I also walked the proposed site behind the main market: level ground, existing security fencing, and a transformer within 40 meters if we ever want a grid tie.",
      aiSummaryChips: [{ kind: "progress", label: "Cooperative board meeting booked" }],
      isEffortVerified: true,
    },
    {
      id: "solar-log-jul-4",
      authorId: "samuel-kiprop",
      date: "Jul 4, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image04.avif",
      transcriptExcerpt:
        "Finished the site shortlist two days early — five candidate locations scored on access roads, security, and distance to the aggregation sheds.",
      detail:
        "Nakuru West and Gilgil junction score highest. I logged drive times at market-day traffic, not off-peak, since that is when crates actually move. Recommend we drop the Naivasha site: the access road floods in the long rains.",
      aiSummaryChips: [
        { kind: "velocity", label: "Site shortlist done 2 days early" },
        { kind: "suggestion", label: "Drop flood-prone Naivasha site" },
      ],
      isEffortVerified: true,
    },
  ],
  fundingRounds: [
    {
      id: "solar-round-community-preseed",
      type: "crowdfunding",
      goalAmount: "$6,000",
      raisedAmount: "$1,450",
      percentageFunded: 24,
      backersCount: 38,
      closesOnDate: "Aug 30, 2026",
      status: "open",
    },
  ],
  escrowLedger: [
    {
      id: "solar-escrow-5",
      date: "Jul 2, 2026",
      description: "Backer pledges — week of Jun 29",
      direction: "in",
      amount: "$450",
      verificationStatus: "pending",
    },
    {
      id: "solar-escrow-4",
      date: "Jun 28, 2026",
      description: "Backer pledges — week of Jun 22",
      direction: "in",
      amount: "$250",
      verificationStatus: "verified",
    },
    {
      id: "solar-escrow-3",
      date: "Jun 22, 2026",
      description: "Milestone release — 400-vendor demand survey",
      direction: "out",
      amount: "$600",
      linkedMilestoneId: "solar-milestone-demand-survey",
      verificationStatus: "verified",
    },
    {
      id: "solar-escrow-2",
      date: "Jun 14, 2026",
      description: "Backer pledges — week of Jun 8",
      direction: "in",
      amount: "$400",
      verificationStatus: "verified",
    },
    {
      id: "solar-escrow-1",
      date: "Jun 5, 2026",
      description: "Community round opening deposits",
      direction: "in",
      amount: "$350",
      verificationStatus: "verified",
    },
  ],
  watchersCount: 214,
  dailyLogStreakDays: 12,
  originProblemReportId: "report-produce-spoilage-nakuru",
  relatedInsightIds: [
    "insight-cold-storage-demand",
    "insight-solar-hardware-costs",
    "insight-smallholder-financing",
  ],
};
