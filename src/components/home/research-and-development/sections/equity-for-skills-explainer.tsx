// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Link from "next/link";

type EquityStep = {
  stepNumber: string;
  title: string;
  blurb: string;
};

// Four steps from an hour of work to a share of the company. The wording is
// load-bearing: a stake is EARNED, never granted. Nobody types a percentage
// into anyone's row — the number is recomputed from verified effort every time
// anyone contributes, which is also why a share can fall.
const EQUITY_STEPS: EquityStep[] = [
  {
    stepNumber: "01",
    title: "You log the work",
    blurb:
      "A daily log — what you did, for how long, with the artifact that proves it. One log per working day.",
  },
  {
    stepNumber: "02",
    title: "The work is verified",
    blurb:
      "Verification checks the claim against what the work left behind. A flagged claim goes to human review, in writing, and can be reversed.",
  },
  {
    stepNumber: "03",
    title: "Verified time mints slices",
    blurb:
      "Verified minutes multiply by your locked rate to mint slices. Unpaid time mints more slices than paid time — the risk you take is what the pie pays for.",
  },
  {
    stepNumber: "04",
    title: "Slices become basis points",
    blurb:
      "Your share is your slices over everyone's slices, expressed in basis points. It moves every month, including down when others out-contribute you.",
  },
];

// Stage 03 explainer: how a stake is earned rather than assigned. Sits above
// the roles grid so an equity range on a role card reads as an OFFER — what
// this role could earn if the work lands — and never as an allocated stake.
export default function EquityForSkillsExplainer() {
  return (
    <section className="space-y-4 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          Equity is computed, never assigned
        </h2>
        <p className="text-sm text-muted-foreground">
          A role&apos;s equity range is an offer, not a stake you hold on day one. There is no
          column anywhere on Qatoto where a founder can type a number into your share.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {EQUITY_STEPS.map((equityStep) => (
          <div key={equityStep.stepNumber} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <p className="text-xs text-muted-foreground">{equityStep.stepNumber}</p>
            <p className="mt-2 font-medium">{equityStep.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{equityStep.blurb}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        See the whole ledger on a live project —{" "}
        <Link
          href="/research-and-development/project/solar-cold-storage/proof-of-effort"
          className="font-medium text-[#00696E] underline underline-offset-2"
        >
          SolarChill&apos;s Proof of Effort
        </Link>{" "}
        shows every slice, every verification run and every dispute behind its cap table.
      </p>
    </section>
  );
}
