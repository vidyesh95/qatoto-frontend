// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Link from "next/link";

type AccountabilityMechanism = {
  title: string;
  blurb: string;
  linkLabel: string;
  href: string;
};

// Three mechanisms, each one operated on a per-project surface. This page
// explains them; the links are where someone actually acts, because an action
// needs an actor whose role is resolved — and a cross-project page has none.
const ACCOUNTABILITY_MECHANISMS: AccountabilityMechanism[] = [
  {
    title: "A 24-hour dispute window",
    blurb:
      "Before an allocation settles, any member has a day to contest it with grounds and evidence. A raised dispute freezes the contested slices outside the pie until it resolves — the pool is frozen, never anyone's cash.",
    linkLabel: "See a live dispute window",
    href: "/research-and-development/project/solar-cold-storage/proof-of-effort",
  },
  {
    title: "Human review that can go three ways",
    blurb:
      "An automated flag can be contested, and a maintainer decides in writing: reverse the flag, uphold it, or reverse it against the member who asked. A review that can only agree with the person who requested it is not a review.",
    linkLabel: "See the verification pipeline",
    href: "/research-and-development/project/solar-cold-storage/proof-of-effort",
  },
  {
    title: "An audit trail nobody can rewrite",
    blurb:
      "Every allocation, verdict and statement is hashed into a chain, so a changed record breaks every entry after it. Corrections supersede — nothing is ever edited in place, and the superseded version stays readable.",
    linkLabel: "Verify a project's chain",
    href: "/research-and-development/project/solar-cold-storage/proof-of-effort",
  },
];

// Stage 05 explainer: how a disagreement is settled. Every link leaves for a
// per-project surface deliberately — this page carries no action of its own.
export default function AccountabilityExplainer() {
  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          When someone disagrees with a number
        </h2>
        <p className="text-xs text-muted-foreground">
          Disputes, human review and the audit trail are operated inside each project, by people
          whose role that project already knows. This page only explains them.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {ACCOUNTABILITY_MECHANISMS.map((mechanism) => (
          <div
            key={mechanism.title}
            className="flex flex-col rounded-2xl border border-[#CAC4D0]/60 p-4"
          >
            <p className="font-medium">{mechanism.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{mechanism.blurb}</p>
            <Link
              href={mechanism.href}
              className="mt-3 text-xs font-medium text-[#00696E] underline underline-offset-2"
            >
              {mechanism.linkLabel}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
