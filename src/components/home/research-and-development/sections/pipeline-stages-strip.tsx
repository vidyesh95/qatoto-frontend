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
  {
    stepNumber: "01",
    title: "Market Research",
    blurb: "See where demand is highest before anything gets built.",
    iconSrc: "/icons/analytics_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/research-and-development/knowledge-hub",
  },
  {
    stepNumber: "02",
    title: "Problem Mapping",
    blurb: "Real gaps reported from the ground, scored by opportunity.",
    iconSrc: "/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/research-and-development/problem-map",
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

// Horizontally scrolling strip of the six pipeline stages. Every card lands on
// a page that teaches its stage — never an in-page anchor, which used to scroll
// the landing page instead of going anywhere, and left team building, daily
// logs and governance reachable only from inside a project someone had already
// picked.
export default function PipelineStagesStrip() {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 lg:px-6">
      {PIPELINE_STAGES.map((stage) => (
        <Link
          key={stage.stepNumber}
          href={stage.href}
          className="min-w-56 rounded-2xl border border-[#CAC4D0]/60 p-4 transition-colors hover:bg-gray-100"
        >
          <p className="text-xs text-muted-foreground">{stage.stepNumber}</p>
          <div className="mt-2 grid size-10 place-items-center rounded-full bg-[#00696E]/10">
            <Image src={stage.iconSrc} width={24} height={24} alt="" />
          </div>
          <p className="mt-3 font-medium">{stage.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stage.blurb}</p>
        </Link>
      ))}
    </div>
  );
}
