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
    href: "#open-roles",
  },
  {
    stepNumber: "04",
    title: "Build & Daily Logs",
    blurb: "AI-analyzed video logs turn effort into proof.",
    iconSrc: "/icons/fact_check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "#featured-projects",
  },
  {
    stepNumber: "05",
    title: "Funding & Governance",
    blurb: "Milestone-gated escrow keeps every dollar accountable.",
    iconSrc: "/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "#featured-projects",
  },
  {
    stepNumber: "06",
    title: "Go-to-Market",
    blurb: "Manufacture, ship, and sell through the Qatoto store.",
    iconSrc: "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    href: "/store",
  },
];

// Horizontally scrolling strip of the six pipeline stages. Each card links to
// the surface that carries that stage (knowledge hub, problem map, in-page
// anchors, or the store for go-to-market).
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
