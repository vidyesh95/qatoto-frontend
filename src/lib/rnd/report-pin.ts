// TRANSPORT: props-only — pure arithmetic and copy. No network, no browser API.
//
// The reporter's optional coarse pin (`todo.md` §19.1). This module is where the ~110 m rounding
// happens, and it is deliberately separate from anything that can reach the network: the value it
// returns is the ONLY form of a coordinate the rest of the app is allowed to hold.

/**
 * How many decimal places of a degree survive.
 *
 * ⚠️ **THREE IS ~110 m, AND THE NUMBER IS THE WHOLE PRIVACY MECHANISM.**
 * `docs/GEOLOCATION_PRIVACY.md` records that a 6-decimal coordinate is ~0.11 m and is PII under
 * both the GDPR and the DPDP Act, and its correction header says the answer "is not to collect it,
 * rather than to collect it and defend it". A server that never receives a precise point has no
 * dual-storage split to build, no fuzzing function to write, no 90-day purge to promise and no
 * coordinate-erasure path to serve a data-subject request with. Every one of those is unnecessary
 * rather than unbuilt, and it stays that way only while this rounding happens in the browser.
 *
 * It matches the backend's own `quantizePublishedMicrodegrees` grid (1,000 microdegrees), which
 * re-applies it on receipt — because a client-side check is UX feedback and never a control.
 */
const PIN_DECIMAL_PLACES = 3;
const MICRODEGREES_PER_DEGREE = 1_000_000;
const PIN_GRID_MICRODEGREES = MICRODEGREES_PER_DEGREE / 10 ** PIN_DECIMAL_PLACES;

/**
 * A pin, already coarse.
 *
 * ⚠️ **ONE OBJECT, NEVER TWO FIELDS.** Both coordinates or neither is a rule the request schema
 * refines, the database CHECKs, and the UI makes UNCONSTRUCTIBLE by holding them together — half a
 * pin is a point that does not exist, and the only thing anyone could do with one is guess the
 * other half.
 */
export interface ApproximatePin {
  readonly latitudeMicrodegrees: number;
  readonly longitudeMicrodegrees: number;
}

/**
 * Degrees from a map tap or a device reading, to the coarse integer microdegrees that go on the
 * wire.
 *
 * ⚠️ **CALL THIS BEFORE THE VALUE REACHES REACT STATE.** For `navigator.geolocation` that means
 * calling it inside the success callback, so the precise reading never lives in a variable that
 * outlives the callback. Storing the raw value and rounding later would put a PII-grade coordinate
 * in a React state tree, a re-render trace and every devtools snapshot taken while the sheet is
 * open.
 *
 * Rounds half away from zero rather than through `Math.round`, which sends -0.5 towards +0 and
 * would bias southern and western pins differently from northern and eastern ones — the same rule
 * the backend's quantizer states.
 */
export function toApproximatePin(
  latitudeDegrees: number,
  longitudeDegrees: number,
): ApproximatePin {
  return {
    latitudeMicrodegrees: quantizeToPinGrid(latitudeDegrees * MICRODEGREES_PER_DEGREE),
    longitudeMicrodegrees: quantizeToPinGrid(longitudeDegrees * MICRODEGREES_PER_DEGREE),
  };
}

function quantizeToPinGrid(microdegrees: number): number {
  const half = PIN_GRID_MICRODEGREES / 2;
  const shifted = microdegrees >= 0 ? microdegrees + half : microdegrees - half;
  return shifted - (shifted % PIN_GRID_MICRODEGREES);
}

/** Back to degrees, for placing the marker the reporter sees. */
export function toPinDegrees(pin: ApproximatePin): { latitude: number; longitude: number } {
  return {
    latitude: pin.latitudeMicrodegrees / MICRODEGREES_PER_DEGREE,
    longitude: pin.longitudeMicrodegrees / MICRODEGREES_PER_DEGREE,
  };
}

/**
 * The readout under the map — the exact value that will be sent, at the exact precision it carries.
 *
 * Printing three decimals is not formatting: it is the claim the disclosure beside it makes, shown
 * rather than asserted. A readout with more digits than the wire carries would be a promise of
 * precision nobody keeps.
 */
export function formatPinReadout(pin: ApproximatePin): string {
  const degrees = toPinDegrees(pin);
  return `${degrees.latitude.toFixed(PIN_DECIMAL_PLACES)}, ${degrees.longitude.toFixed(PIN_DECIMAL_PLACES)}`;
}

/**
 * Said once, under the map, and it is a statement of fact rather than a request for consent.
 *
 * ⚠️ **THERE IS NO CONSENT CHECKBOX AND THERE MUST NOT BE ONE.** `GEOLOCATION_PRIVACY.md` §4's
 * proposed tick-box promises a 90-day purge we cannot keep and claims the exact point is "stored
 * privately", which is false once there is nothing precise to store. A checkbox asserting two
 * untrue things is worse than one sentence asserting a true one.
 */
export const PIN_ROUNDING_DISCLOSURE =
  "Rounded to about 110 m before it leaves your browser. We never receive a more precise point than this.";
