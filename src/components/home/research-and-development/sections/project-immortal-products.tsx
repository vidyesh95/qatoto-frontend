import type { ImmortalProductOpportunity } from "@/types/research-and-development";

type ProjectImmortalProductsProps = {
  opportunities: ImmortalProductOpportunity[];
};

// Research only pays for itself if something shippable comes out of it. Qatoto
// reads the branch map and highlights the products each branch can unlock.
export default function ProjectImmortalProducts({ opportunities }: ProjectImmortalProductsProps) {
  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Products Qatoto has highlighted as monetizable from this research. Building one funds the
        next round of the program.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {opportunities.map((opportunity) => (
          <div
            key={opportunity.id}
            className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
          >
            <p className="text-[10px] tracking-widest text-[#00696E]">QATOTO HIGHLIGHTED</p>
            <p className="text-sm font-medium">{opportunity.productName}</p>
            <p className="text-xs text-muted-foreground">{opportunity.productDescription}</p>
            <p className="text-xs text-muted-foreground">
              From: {opportunity.derivedFromBranchTitle}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-[#00696E]/10 px-2.5 py-0.5 text-xs text-[#00696E]">
                {opportunity.marketPotentialLabel}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                {opportunity.readinessLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
