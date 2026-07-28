// TRANSPORT: props-only — pure geometry, no network.
//
// Projects the backend's integer microdegrees onto the static world-map canvas.
//
// WHY THIS EXISTS: `ProblemReport.mapPosition: { leftPercent, topPercent }` used to
// come from the server. It could not survive integration — a CSS offset into one
// specific SVG at one aspect ratio is meaningless to MapKit, MapLibre or Google Maps,
// so both native clients were dead on arrival. The wire carries lat/lng microdegrees
// and each client projects them for whatever canvas it draws on. This is the web
// client's projection and nothing else depends on it.

const MICRODEGREES_PER_DEGREE = 1_000_000;

/**
 * The canvas is `public/dummy/world_map.svg` — 2000 × 857, so 2.33:1 rather than the
 * 2:1 a full plate carrée would be. It is an equirectangular map with the poles
 * CROPPED (Simplemaps cuts Antarctica), which is why the vertical range is not ±90.
 *
 * Longitude maps linearly across the full 360°. Latitude maps linearly too, but only
 * across the cropped window: 857px ÷ (2000px ÷ 360°) = 154.26° of latitude, placed to
 * keep Greenland in frame and drop the Antarctic mainland.
 *
 * THESE TWO CONSTANTS ARE CALIBRATED ESTIMATES, derived from the aspect ratio rather
 * than from the map's own metadata — the SVG carries no `viewBox` and states no
 * projection. They are close, not exact. If a pin sits visibly off its country, adjust
 * them HERE and nowhere else: one visual pass against a few known coordinates
 * (Nairobi -1.29/36.82, Reykjavík 64.15/-21.94, Ushuaia -54.80/-68.30) pins them down.
 */
const CANVAS_NORTH_LATITUDE_DEGREES = 83.0;
const CANVAS_SOUTH_LATITUDE_DEGREES = -71.26;

const CANVAS_LATITUDE_SPAN_DEGREES = CANVAS_NORTH_LATITUDE_DEGREES - CANVAS_SOUTH_LATITUDE_DEGREES;

export interface MapCanvasPosition {
  /** CSS `left`, 0–100. */
  readonly leftPercent: number;
  /** CSS `top`, 0–100. */
  readonly topPercent: number;
}

function clampToPercentRange(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Integer microdegrees → a percentage offset into the map canvas.
 *
 * Clamped to 0–100 so a coordinate outside the cropped window (an Antarctic research
 * station, say) pins to the map edge instead of escaping its container and overlapping
 * unrelated UI. A clamped pin is wrong by a little; an unclamped one is a layout bug.
 */
export function projectMicrodegreesToMapPercent(coordinates: {
  readonly latitudeMicrodegrees: number;
  readonly longitudeMicrodegrees: number;
}): MapCanvasPosition {
  const latitudeDegrees = coordinates.latitudeMicrodegrees / MICRODEGREES_PER_DEGREE;
  const longitudeDegrees = coordinates.longitudeMicrodegrees / MICRODEGREES_PER_DEGREE;

  return {
    leftPercent: clampToPercentRange(((longitudeDegrees + 180) / 360) * 100),
    topPercent: clampToPercentRange(
      ((CANVAS_NORTH_LATITUDE_DEGREES - latitudeDegrees) / CANVAS_LATITUDE_SPAN_DEGREES) * 100,
    ),
  };
}

// --- Opportunity score bands -------------------------------------------------

/**
 * `unscored` is a real band, not a fallback. `opportunityScorePoints` is NULL until the
 * first scoring run, and colouring that as "low opportunity" would publish a finding
 * about the place when the only finding is that no job has looked at it yet.
 */
export type OpportunityBand = "high" | "medium" | "low" | "unscored";

const HIGH_OPPORTUNITY_THRESHOLD_POINTS = 80;
const MEDIUM_OPPORTUNITY_THRESHOLD_POINTS = 60;

export function toOpportunityBand(opportunityScorePoints: number | null): OpportunityBand {
  if (opportunityScorePoints === null) return "unscored";
  if (opportunityScorePoints >= HIGH_OPPORTUNITY_THRESHOLD_POINTS) return "high";
  if (opportunityScorePoints >= MEDIUM_OPPORTUNITY_THRESHOLD_POINTS) return "medium";
  return "low";
}

/** Badge colours. `unscored` is deliberately neutral — grey states an absence. */
export const OPPORTUNITY_BAND_BADGE_CLASS: Record<OpportunityBand, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-[#00696E]/10 text-[#00696E]",
  unscored: "bg-muted text-muted-foreground",
};

/** Pin diameter. An unscored cluster still exists, so it gets the smallest dot. */
export const OPPORTUNITY_BAND_PIN_SIZE_CLASS: Record<OpportunityBand, string> = {
  high: "size-5",
  medium: "size-4",
  low: "size-3",
  unscored: "size-2",
};
