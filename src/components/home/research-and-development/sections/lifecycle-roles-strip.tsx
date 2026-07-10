import Image from "next/image";

import SectionHeader from "@/components/home/research-and-development/sections/section-header";

type LifecycleRole = {
  title: string;
  blurb: string;
  iconSrc: string;
  compensationModes: string[];
};

// The five ways to contribute to a product's lifecycle on Qatoto. Anyone works
// the part that matches their expertise; Qatoto tracks the effort and the money.
const LIFECYCLE_ROLES: LifecycleRole[] = [
  {
    title: "Researcher",
    blurb:
      "Develop concepts, publish formal or informal papers, optimize products. Qatoto aggregates the research, marks overlapping work, and highlights what is missing.",
    iconSrc: "/icons/science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    compensationModes: ["Salary", "Equity"],
  },
  {
    title: "Founder & Director",
    blurb: "Steer the project and make sure proper execution is carried out, stage by stage.",
    iconSrc: "/icons/flag_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    compensationModes: ["Salary", "Equity"],
  },
  {
    title: "Venture Capitalist",
    blurb:
      "Fund the project through milestone-gated escrow; every dollar is tracked to the work it backs.",
    iconSrc: "/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    compensationModes: ["Equity"],
  },
  {
    title: "Supplier",
    blurb: "Supply the parts or assemble the product once the design leaves the workshop.",
    iconSrc: "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    compensationModes: ["One-time", "Equity"],
  },
  {
    title: "Supporter",
    blurb: "Deliver aftersales service and keep the people who bought it running.",
    iconSrc: "/icons/support_agent_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    compensationModes: ["Salary", "One-time"],
  },
];

// Landing strip explaining who can contribute and how they get paid. Sits under
// the pipeline stages: the stages are what gets built, these are who builds it.
export default function LifecycleRolesStrip() {
  return (
    <section className="space-y-4">
      <SectionHeader title="Contribute across the lifecycle" />
      <p className="max-w-3xl px-4 text-sm text-muted-foreground lg:px-6">
        Work on whichever part of the product lifecycle matches your expertise. Qatoto tracks
        everyone&apos;s effort and money applied, then distributes salary, a one-time payout, or
        equity — whichever each contributor needs.
      </p>
      <div className="grid gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-5">
        {LIFECYCLE_ROLES.map((lifecycleRole) => (
          <div
            key={lifecycleRole.title}
            className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
          >
            <div className="grid size-10 place-items-center rounded-full bg-[#00696E]/10">
              <Image src={lifecycleRole.iconSrc} width={24} height={24} alt="" />
            </div>
            <p className="text-sm font-medium">{lifecycleRole.title}</p>
            <p className="text-xs text-muted-foreground">{lifecycleRole.blurb}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {lifecycleRole.compensationModes.map((compensationMode) => (
                <span
                  key={compensationMode}
                  className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-[10px] text-[#00696E]"
                >
                  {compensationMode}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
