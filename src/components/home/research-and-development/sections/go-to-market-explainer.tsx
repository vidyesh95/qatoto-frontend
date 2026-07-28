// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Image from "next/image";

type GoToMarketStep = {
  stepNumber: string;
  title: string;
  blurb: string;
  iconSrc: string;
};

const GO_TO_MARKET_STEPS: GoToMarketStep[] = [
  {
    stepNumber: "01",
    title: "Pick a partner",
    blurb:
      "A manufacturer for a design you own, or an ODM that takes it from spec to finished unit. Capability, region, lead time and minimum order decide which.",
    iconSrc: "/icons/factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    stepNumber: "02",
    title: "Run the batch",
    blurb:
      "Tooling, a pilot run, then production. The engagement records which project worked with which supplier, so the provenance survives the handoff.",
    iconSrc: "/icons/package_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    stepNumber: "03",
    title: "Move it",
    blurb:
      "Freight, customs and last-mile distribution. Cold-chain goods carry their own logging; certification partners handle market entry.",
    iconSrc: "/icons/local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    stepNumber: "04",
    title: "List it",
    blurb:
      "The listing is created in the studio, where pricing, inventory and fulfilment already live. R&D hands over the project; it does not fork a second product concept.",
    iconSrc: "/icons/storefront_24dp_00696E_FILL0_wght400_GRAD0_opsz24.svg",
  },
];

// Stage 06 explainer: the four steps of the stage, in order. Deliberately ends
// on the studio rather than on the store — one is where a listing is created,
// the other is where a buyer browses.
export default function GoToMarketExplainer() {
  return (
    <section className="space-y-3 px-4 lg:px-6">
      <h2 className="text-sm font-medium tracking-wide xl:text-lg">
        What this stage actually involves
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {GO_TO_MARKET_STEPS.map((step) => (
          <div key={step.stepNumber} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <p className="text-xs text-muted-foreground">{step.stepNumber}</p>
            <div className="mt-2 grid size-10 place-items-center rounded-full bg-[#00696E]/10">
              <Image src={step.iconSrc} width={24} height={24} alt="" />
            </div>
            <p className="mt-3 font-medium">{step.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{step.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
