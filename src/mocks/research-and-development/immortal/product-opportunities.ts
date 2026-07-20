// Mock Project Immortal product opportunities. Split out of
// project-immortal-mocks.ts only for file size — same convention: fixtures,
// no getters.

import type { ImmortalProductOpportunity } from "@/types/research-and-development";

export const MOCK_IMMORTAL_PRODUCT_OPPORTUNITIES: ImmortalProductOpportunity[] = [
  {
    id: "product-senolytic-line",
    productName: "Senolytic supplement line",
    productDescription:
      "Intermittent-dosing formulations sold through the Qatoto store once trial endpoints clear.",
    derivedFromBranchTitle: "Human Senolytic Trials",
    marketPotentialLabel: "$12B est. market",
    readinessLabel: "Monetizable in 2–4 yrs",
  },
  {
    id: "product-epigenetic-test-kit",
    productName: "Epigenetic age home test kit",
    productDescription:
      "Mail-in saliva kit returning a biological-age readout and a healthspan action plan.",
    derivedFromBranchTitle: "Epigenetic Clocks",
    marketPotentialLabel: "$3.4B est. market",
    readinessLabel: "Monetizable in 1–2 yrs",
  },
  {
    id: "product-organ-transport-unit",
    productName: "Organ preservation transport unit",
    productDescription:
      "Machine-perfusion cold-chain hardware that stretches the transplant window to days.",
    derivedFromBranchTitle: "Organ Preservation",
    marketPotentialLabel: "$1.8B est. market",
    readinessLabel: "Monetizable in 3–5 yrs",
  },
  {
    id: "product-screening-platform",
    productName: "Geroprotector screening platform",
    productDescription:
      "Licensed model access for labs ranking compound libraries before touching a pipette.",
    derivedFromBranchTitle: "Geroprotector Screening",
    marketPotentialLabel: "$740M est. market",
    readinessLabel: "Monetizable now",
  },
];
