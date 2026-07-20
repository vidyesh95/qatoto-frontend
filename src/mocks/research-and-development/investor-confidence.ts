// Confidence signal per project for the /funding deal-flow view (0–100, drives
// the meter width). Display-only mock — the backend derives the real score from
// log streaks and verified milestones later. solar-cold-storage matches the
// hardcoded meter on the project Funding tab.
export const MOCK_INVESTOR_CONFIDENCE_BY_PROJECT_ID: Record<string, number> = {
  "solar-cold-storage": 78,
  "modular-water-purification": 64,
  "agricultural-drone-kits": 71,
  "prefab-housing-panels": 83,
  "e-waste-recycling-line": 76,
  "medical-cold-chain-packaging": 91,
};
