// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Image from "next/image";
import Link from "next/link";

type PipelineStage = {
  stepNumber: string;
  title: string;
  blurb: string;
  iconSrc: string;
  href: string;
};

const PIPELINE_STAGES: PipelineStage[] = [
  // Problem mapping leads the pipeline because market research depends on it, not the
  // other way round: the knowledge hub's demand leaderboard is a nightly GROUP BY over
  // problem clusters and submissions (backend recompute-demand-signals). With no problem
  // reports filed there is no demand signal to research.
  {
    stepNumber: "01",
    title: "Problem Mapping",
    blurb: "Real gaps reported from the ground, scored by opportunity.",
    iconSrc: "/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/research-and-development/problem-map",
  },
  {
    stepNumber: "02",
    title: "Market Research",
    blurb: "See where demand is highest before anything gets built.",
    iconSrc: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/research-and-development/knowledge-hub",
  },
  {
    stepNumber: "03",
    title: "Team Building",
    blurb: "Join a project and trade your skills for equity.",
    iconSrc: "/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/research-and-development/team-building",
  },
  {
    stepNumber: "04",
    title: "Build & Daily Logs",
    blurb: "AI-analyzed daily logs turn effort into proof. Logs stay private to their team.",
    iconSrc: "/icons/fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/research-and-development/build-log",
  },
  {
    stepNumber: "05",
    title: "Funding & Governance",
    blurb: "Commitments on the record, and a month-end statement everyone can check.",
    iconSrc: "/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/research-and-development/governance",
  },
  {
    stepNumber: "06",
    title: "Go-to-Market",
    blurb: "Find a manufacturer, ship the batch, and list the product for sale.",
    iconSrc: "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/research-and-development/go-to-market",
  },
];

// The teal wash on each card deepens stage by stage: the pipeline starts as an
// idea on paper (01, plain white) and ends as a product in the market (06, the
// deepest tint). The ramp is strictly monotonic so it reads as sequence, not as
// six accidentally different cards. Indexed by stage position; listed as literal
// class strings because Tailwind only sees classes it can read at build time.
const STAGE_BACKGROUND_TINT_CLASSES = [
  "bg-transparent",
  "bg-[#00696E]/3",
  "bg-[#00696E]/6",
  "bg-[#00696E]/9",
  "bg-[#00696E]/12",
  "bg-[#00696E]/15",
];

// Wrap grid of the six pipeline stages — 1 column on mobile, 2 from `sm`, 3 from
// `xl` — so every stage is visible at once (the old horizontal scroller hid the
// later cards off-screen with no affordance). Stage numerals are set in the same
// serif as the hero headline, tying the strip to the page's opening voice. Every
// card lands on a page that teaches its stage — never an in-page anchor, which
// used to scroll the landing page instead of going anywhere, and left team
// building, daily logs and governance reachable only from inside a project
// someone had already picked.
export default function PipelineStagesStrip() {
  return (
    <div className="grid gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-3">
      {PIPELINE_STAGES.map((stage, stageIndex) => (
        <Link
          key={stage.stepNumber}
          href={stage.href}
          className={`rounded-2xl border border-[#CAC4D0]/60 p-6 transition-colors hover:border-[#00696E]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] ${STAGE_BACKGROUND_TINT_CLASSES[stageIndex]}`}
        >
          <div className="flex items-start justify-between">
            <div className="grid size-10 place-items-center rounded-full bg-[#00696E]/10">
              <Image src={stage.iconSrc} width={24} height={24} alt="" />
            </div>
            <p className="font-serif text-3xl leading-none text-[#00696E]/30">{stage.stepNumber}</p>
          </div>
          <p className="mt-5 font-medium">{stage.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{stage.blurb}</p>
        </Link>
      ))}
    </div>
  );
}
