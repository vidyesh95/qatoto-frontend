import type { MarketInsight } from "@/types/research-and-development";

export const MOCK_MARKET_INSIGHTS: MarketInsight[] = [
  {
    id: "insight-cold-storage-demand",
    headline: "Demand for off-grid cold storage is up 34% year over year in East Africa",
    statValue: "+34%",
    trendDirection: "up",
    region: "East Africa",
    category: "Cold Chain",
    sourceNote: "Qatoto demand index, Jun 2026",
  },
  {
    id: "insight-water-access-gap",
    headline:
      "68 million people in South Asia draw from groundwater flagged for arsenic contamination",
    statValue: "68M people",
    trendDirection: "up",
    region: "South Asia",
    category: "Water & Sanitation",
    sourceNote: "WHO regional water survey, 2025",
  },
  {
    id: "insight-drone-agriculture-growth",
    headline: "Smallholder drone-scouting service bookings in Latin America doubled in 18 months",
    statValue: "+112%",
    trendDirection: "up",
    region: "Latin America",
    category: "Precision Agriculture",
    sourceNote: "Regional agri-service marketplace data, May 2026",
  },
  {
    id: "insight-prefab-construction-surge",
    headline: "Post-typhoon rebuild programs list prefab wall panels as their top procurement gap",
    statValue: "+41%",
    trendDirection: "up",
    region: "Southeast Asia",
    category: "Modular Construction",
    sourceNote: "Philippine housing authority tenders, Q1 2026",
  },
  {
    id: "insight-e-waste-volume",
    headline: "West Africa receives an estimated 250,000 tonnes of untracked e-waste each year",
    statValue: "250K tonnes",
    trendDirection: "up",
    region: "West Africa",
    category: "E-Waste & Recycling",
    sourceNote: "Basel Convention shipment estimates, 2025",
  },
  {
    id: "insight-pharma-logistics-compliance",
    headline:
      "New EU rules require validated cold-chain packaging on three times more pharma shipment classes",
    statValue: "3× coverage",
    trendDirection: "up",
    region: "Europe",
    category: "Medical Logistics",
    sourceNote: "EU GDP directive amendment, Mar 2026",
  },
  {
    id: "insight-solar-hardware-costs",
    headline:
      "Off-grid solar component costs have fallen 22% since 2024, widening rural hardware margins",
    statValue: "-22%",
    trendDirection: "down",
    region: "Global",
    category: "Off-Grid Solar",
    sourceNote: "Distributor price index, Jun 2026",
  },
  {
    id: "insight-smallholder-financing",
    headline: "Smallholder equipment-financing approval rates have plateaued near 31%",
    statValue: "31%",
    trendDirection: "flat",
    region: "East Africa",
    category: "Smallholder Finance",
    sourceNote: "Agri-lender consortium report, Apr 2026",
  },
];
