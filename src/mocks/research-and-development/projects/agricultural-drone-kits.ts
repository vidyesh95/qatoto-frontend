import type { ResearchProject } from "@/types/research-and-development";

export const AGRICULTURAL_DRONE_KITS_PROJECT: ResearchProject = {
  id: "agricultural-drone-kits",
  name: "AgriFly Drone Kits",
  tagline: "Affordable crop-scouting drone kits assembled and serviced locally across the Andes.",
  description:
    "AgriFly packages a crop-scouting drone as a kit: composite airframe, open flight firmware, and a multispectral camera tuned for terraced smallholdings that imported services refuse to fly. Kits are assembled and repaired by local technicians, keeping the service price within reach of farms under two hectares. The reference design has flown; the team is now hiring the pilots and supply-chain hands to run the first ten-farm trial.",
  category: "Precision Agriculture",
  stage: "team-building",
  coverImageSrc: "/dummy/rnd_project_cover_03.avif",
  founderId: "mateo-villanueva",
  teamMembers: [
    {
      id: "mateo-villanueva",
      name: "Mateo Villanueva",
      avatarImageSrc: "/dummy/profile_image_08.avif",
      role: "Founder & Aeronautics Engineer",
      skills: ["Flight-control firmware", "Composite airframes", "Agronomy basics"],
      equityShare: "58%",
      effortHoursLogged: 232,
      joinedDate: "Feb 9, 2026",
      isFounder: true,
    },
    {
      id: "camila-rojas",
      name: "Camila Rojas",
      avatarImageSrc: "/dummy/profile_image_09.avif",
      role: "Agronomy Lead",
      skills: ["Crop pathology", "NDVI interpretation", "Farmer training"],
      equityShare: "10%",
      effortHoursLogged: 141,
      joinedDate: "Mar 3, 2026",
    },
    {
      id: "diego-fernandez",
      name: "Diego Fernández",
      avatarImageSrc: "/dummy/profile_image_10.avif",
      role: "Embedded Engineer",
      skills: ["C++", "Sensor fusion", "PCB bring-up"],
      equityShare: "8%",
      effortHoursLogged: 128,
      joinedDate: "Mar 21, 2026",
    },
    {
      id: "lucia-herrera",
      name: "Lucía Herrera",
      avatarImageSrc: "/dummy/profile_image_11.avif",
      role: "Community & Partnerships",
      skills: ["Cooperative outreach", "Spanish and Quechua interpretation"],
      equityShare: "5%",
      effortHoursLogged: 87,
      joinedDate: "Apr 14, 2026",
    },
  ],
  openRoles: [
    {
      id: "drone-role-flight-test-pilot",
      projectId: "agricultural-drone-kits",
      projectName: "AgriFly Drone Kits",
      roleTitle: "Flight Test Pilot",
      skills: ["UAV piloting", "Flight logging", "Safety procedures"],
      compensation: [
        {
          kind: "one-time",
          amountLabel: "$3.5k",
          earnedAsLabel: "Released per verified flight-test campaign",
        },
      ],
      commitment: "part-time",
    },
    {
      id: "drone-role-supply-chain-lead",
      projectId: "agricultural-drone-kits",
      projectName: "AgriFly Drone Kits",
      roleTitle: "Supply Chain Lead",
      skills: ["Component sourcing", "Import compliance", "Inventory planning"],
      compensation: [
        {
          kind: "salary",
          amountLabel: "$5k/mo",
          earnedAsLabel: "Paid from escrow as milestones verify",
        },
        {
          kind: "one-time",
          amountLabel: "$4k",
          earnedAsLabel: "Released once sourcing setup is verified",
        },
        {
          kind: "equity",
          amountLabel: "3–5%",
          earnedAsLabel: "Vests via Slicing Pie as verified effort lands",
        },
      ],
      commitment: "full-time",
    },
    {
      id: "drone-role-firmware-contributor",
      projectId: "agricultural-drone-kits",
      projectName: "AgriFly Drone Kits",
      roleTitle: "Firmware Contributor",
      skills: ["Rust", "Embedded Linux", "MAVLink"],
      compensation: [
        {
          kind: "equity",
          amountLabel: "0.5–1.5%",
          earnedAsLabel: "Vests via Slicing Pie as verified effort lands",
        },
      ],
      commitment: "hobby",
    },
  ],
  milestones: [
    {
      id: "drone-milestone-reference-design",
      title: "Freeze reference airframe design",
      description:
        "Composite airframe geometry and motor layout locked after wind-tunnel-substitute rig tests.",
      targetDate: "May 2, 2026",
      status: "done",
      escrowReleaseAmount: "$2,200",
    },
    {
      id: "drone-milestone-first-flight",
      title: "Complete first instrumented test flight",
      description:
        "Full sensor payload flown over the test parcel with clean telemetry and imaging capture.",
      targetDate: "Jun 18, 2026",
      status: "done",
      escrowReleaseAmount: "$3,000",
    },
    {
      id: "drone-milestone-core-team",
      title: "Fill flight-test and supply-chain roles",
      description: "Two open roles signed with equity agreements so the field trial can be crewed.",
      targetDate: "Jul 25, 2026",
      status: "current",
      escrowReleaseAmount: "$1,600",
    },
    {
      id: "drone-milestone-field-trial",
      title: "Run 10-farm scouting trial in Cusco",
      description:
        "Weekly scouting flights over ten terraced smallholdings for a full month, with agronomy reports delivered.",
      targetDate: "Sep 5, 2026",
      status: "upcoming",
      escrowReleaseAmount: "$4,500",
    },
    {
      id: "drone-milestone-assembly-manual",
      title: "Publish local assembly and repair manual",
      description:
        "Spanish-language build and maintenance documentation validated by two independent technicians.",
      targetDate: "Oct 17, 2026",
      status: "upcoming",
    },
  ],
  dailyLogs: [
    {
      id: "drone-log-jul-7",
      authorId: "diego-fernandez",
      date: "Jul 7, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image09.avif",
      transcriptExcerpt:
        "Fixed the sensor-fusion drift that was skewing altitude hold above 3,500 meters — the barometer compensation table now covers Andean elevations properly.",
      detail:
        "The stock firmware assumed sea-level-ish operation and drifted badly in thin air. I rebuilt the compensation table from our Cusco test-flight telemetry and altitude hold now stays within half a meter. Pushed the fix upstream to the open firmware repo as well.",
      aiSummaryChips: [
        { kind: "progress", label: "High-altitude drift fixed" },
        { kind: "velocity", label: "Firmware milestone a week early" },
      ],
      isEffortVerified: true,
    },
    {
      id: "drone-log-jul-6",
      authorId: "mateo-villanueva",
      date: "Jul 6, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image10.avif",
      transcriptExcerpt:
        "Motor mounts are backordered six weeks from the usual distributor. I had two candidate mounts machined locally today to test as substitutes.",
      detail:
        "A Cusco machine shop turned both variants around in a day at a third of the imported price. If they pass vibration testing this week, local machining becomes the default and the kit gets cheaper and easier to repair — which was the whole thesis anyway.",
      aiSummaryChips: [
        { kind: "blocker", label: "Motor mounts backordered 6 weeks" },
        { kind: "suggestion", label: "Qualify locally machined mounts" },
      ],
      isEffortVerified: true,
    },
    {
      id: "drone-log-jul-5",
      authorId: "camila-rojas",
      date: "Jul 5, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image11.avif",
      transcriptExcerpt:
        "Finished the scouting report template with the cooperative's agronomist — one page per parcel, traffic-light crop stress zones, and a recommended action per zone.",
      detail:
        "Farmers in the focus group wanted actions, not imagery: spray here, irrigate there, wait elsewhere. The template leads with the recommendation and buries the NDVI maps in an appendix. Two cooperatives asked for sample reports for their next assembly.",
      aiSummaryChips: [{ kind: "progress", label: "Scouting report template validated" }],
      isEffortVerified: true,
    },
    {
      id: "drone-log-jul-4",
      authorId: "lucia-herrera",
      date: "Jul 4, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image12.avif",
      transcriptExcerpt:
        "Held interviews for the flight-test pilot role — three strong candidates, including a licensed instructor from the aero club who already flies survey missions.",
      detail:
        "The instructor candidate can also train future technicians, which doubles the value of the hire. I proposed we weight training ability in the final decision. Reference calls booked for Wednesday; equity conversation drafted with Mateo.",
      aiSummaryChips: [
        { kind: "progress", label: "3 pilot candidates shortlisted" },
        { kind: "suggestion", label: "Weight training ability in hiring" },
      ],
      isEffortVerified: true,
    },
    {
      id: "drone-log-jul-3",
      authorId: "mateo-villanueva",
      date: "Jul 3, 2026",
      videoThumbnailSrc: "/dummy/thumbnail_image01.avif",
      transcriptExcerpt:
        "Batch-built three more airframes in a single day using the new layup jigs — build time per frame is down from nine hours to five and a half.",
      detail:
        "The jigs paid for themselves in one session. At this pace the trial fleet of six aircraft is done two weeks before the field trial starts, leaving margin for a crash spare. Logged the layup procedure on video for the assembly manual.",
      aiSummaryChips: [{ kind: "velocity", label: "Airframe build time down 40%" }],
      isEffortVerified: true,
    },
  ],
  fundingRounds: [
    {
      id: "drone-round-seed-equity",
      type: "equity",
      goalAmount: "$40,000",
      raisedAmount: "$12,400",
      percentageFunded: 31,
      backersCount: 21,
      closesOnDate: "Oct 1, 2026",
      status: "open",
    },
  ],
  escrowLedger: [
    {
      id: "drone-escrow-6",
      date: "Jul 3, 2026",
      description: "Angel pledge — pending fund verification",
      direction: "in",
      amount: "$2,400",
      verificationStatus: "pending",
    },
    {
      id: "drone-escrow-5",
      date: "Jun 20, 2026",
      description: "Milestone release — first instrumented flight",
      direction: "out",
      amount: "$3,000",
      linkedMilestoneId: "drone-milestone-first-flight",
      verificationStatus: "verified",
    },
    {
      id: "drone-escrow-4",
      date: "Jun 19, 2026",
      description: "Backer deposits — June cohort",
      direction: "in",
      amount: "$3,500",
      verificationStatus: "verified",
    },
    {
      id: "drone-escrow-3",
      date: "Jun 2, 2026",
      description: "Backer deposits — late-May cohort",
      direction: "in",
      amount: "$2,800",
      verificationStatus: "verified",
    },
    {
      id: "drone-escrow-2",
      date: "May 9, 2026",
      description: "Milestone release — reference airframe design",
      direction: "out",
      amount: "$2,200",
      linkedMilestoneId: "drone-milestone-reference-design",
      verificationStatus: "verified",
    },
    {
      id: "drone-escrow-1",
      date: "May 6, 2026",
      description: "Seed round opening deposits",
      direction: "in",
      amount: "$3,700",
      verificationStatus: "verified",
    },
  ],
  watchersCount: 302,
  dailyLogStreakDays: 11,
  relatedInsightIds: ["insight-drone-agriculture-growth", "insight-smallholder-financing"],
};
