import { MAP_CANVAS_ASPECT_RATIO, type MapCanvasPosition } from "@/lib/rnd/map-projection";

// TRANSPORT: props-only — a pure layout function. No fetching, no React, no DOM.
//
// Fans out problem-map pins that project onto the same spot.
//
// WHY THIS EXISTS. `projectMicrodegreesToMapPercent` is faithful, and that is the problem: on a
// 2000px-wide world map one degree of longitude is about 5.5px, so two clusters in neighbouring
// suburbs land on the same pixel. This database has exactly that — a Mumbai cluster and a
// Vasai-Virar one, 35km apart, projecting 0.3% of the canvas from each other while the pins
// themselves are 12–20px across. The later pin covered the earlier one completely.
//
// THE COVERED PIN WAS NOT MERELY UGLY, IT WAS UNREACHABLE. The pins are absolutely positioned
// siblings with no `z-index` between them, so the last one in document order paints on top and
// swallows every click aimed at the centre of the one underneath. A cluster you cannot select is
// a cluster you cannot open, and nothing on the page hinted that a second one was there. An E2E
// test caught it as "subtree intercepts pointer events" — the browser reporting, accurately,
// that the visitor's click could never land.
//
// WHY NOT SOLVE IT ON THE WIRE. The obvious alternative is for the backend to send display
// coordinates it has already de-overlapped. `map-projection.ts` records why that was removed:
// a CSS offset into one specific SVG is meaningless to MapKit or MapLibre, so the native
// clients were dead on arrival. Overlap is a function of the CANVAS, not of the data — the same
// two clusters do not overlap on a zoomable map at all — so it has to be solved wherever the
// canvas is known. That is here. `branch-tree-layout.ts` is the same call for the same reason:
// layout is not data.
//
// THE ALGORITHM: greedy proximity grouping, then one ring per group.
//
//   1. Walk the pins in order. A pin joins the first existing group it is within
//      `PIN_COLLISION_DISTANCE_PERCENT` of, otherwise it opens a new group of its own.
//   2. A group of ONE is left exactly where it projected. This is the common case and the
//      honest one — a pin that does not collide never moves.
//   3. A group of two or more is replaced by a ring centred on the group's mean position, its
//      members evenly spaced around it.
//
// It is O(n²) in the number of pins, which is fine and will stay fine: `problem-map-page.tsx`
// caps the read at 50 clusters, so this is at worst 2,500 distance comparisons of two
// subtractions each, once per render.
//
// IT IS FULLY DETERMINISTIC — no randomness, no `Date`, no reliance on object key order. Same
// clusters in, same coordinates out, which is what lets a "use client" island that is still
// server-rendered produce identical markup on both sides and hydrate cleanly. A jittered
// scatter would have been three lines shorter and would have re-jittered on every render.

/**
 * How close two pins must project before they are treated as colliding, in percent of the
 * canvas's WIDTH.
 *
 * ⚠️ THIS IS A PIXEL PROBLEM EXPRESSED IN PERCENT, so it is a calibrated estimate rather than an
 * exact figure — the pins are a fixed 12–20px while the canvas is fluid, so their size in
 * percent depends on how wide the map has been rendered. 2.4% is about 17px at the ~700px the
 * map column occupies on a desktop `lg:grid-cols-[3fr_2fr]` layout, i.e. a shade wider than the
 * largest pin. Too small and covered pins stay covered; too large and pins that were never
 * really in the same place get pulled apart and start lying about where they are.
 */
const PIN_COLLISION_DISTANCE_PERCENT = 2.4;

/**
 * How far apart adjacent pins in a fanned-out group end up, in percent of the canvas's width.
 *
 * Equal to the collision distance on purpose: separating two pins by less than the distance at
 * which they were judged to collide would leave them colliding.
 */
const PIN_SEPARATION_DISTANCE_PERCENT = PIN_COLLISION_DISTANCE_PERCENT;

/** Where the first member of a fanned group sits: straight up from the group's centre. */
const RING_START_ANGLE_RADIANS = -Math.PI / 2;

/**
 * Rounding applied to the final percentages.
 *
 * Three decimals is far below one device pixel at any plausible canvas width, and it keeps the
 * inline `style` strings short and identical between the server render and the client one.
 */
const OUTPUT_DECIMAL_PLACES = 3;

/** A pin to lay out: an identity plus wherever the projection put it. */
export interface ProjectedMapPin {
  readonly id: string;
  readonly position: MapCanvasPosition;
}

/** The same pins, with any that shared a spot fanned out around their shared centre. */
export interface LaidOutMapPin {
  readonly id: string;
  readonly position: MapCanvasPosition;
}

function roundToOutputPrecision(value: number): number {
  const factor = 10 ** OUTPUT_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}

function clampToPercentRange(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Distance between two positions, in percent of the canvas's WIDTH.
 *
 * THE VERTICAL TERM IS SCALED AND THAT IS THE WHOLE POINT OF THIS FUNCTION. `topPercent` is a
 * percentage of the canvas's HEIGHT, which on a 2.33:1 map is a much shorter distance than the
 * same number of percent horizontally. Comparing the two raw would make pins look 2.33× further
 * apart vertically than they are, and a stack of pins separated only by latitude — the Mumbai
 * case exactly — would be judged not to collide.
 */
function distanceInWidthPercent(first: MapCanvasPosition, second: MapCanvasPosition): number {
  const horizontalDelta = first.leftPercent - second.leftPercent;
  const verticalDelta = (first.topPercent - second.topPercent) * MAP_CANVAS_ASPECT_RATIO;
  return Math.hypot(horizontalDelta, verticalDelta);
}

/**
 * The radius a ring of `memberCount` pins needs for its ADJACENT members to sit
 * `PIN_SEPARATION_DISTANCE_PERCENT` apart.
 *
 * Standard chord geometry: `chord = 2 · radius · sin(π / n)`. Solving for the radius keeps the
 * gap between neighbours constant as the group grows, so a group of six spreads into a wider
 * ring rather than a tighter, still-overlapping one — which a fixed radius would have done.
 */
function ringRadiusForMemberCount(memberCount: number): number {
  return PIN_SEPARATION_DISTANCE_PERCENT / (2 * Math.sin(Math.PI / memberCount));
}

/**
 * Groups pins that project onto the same spot and fans each group into a ring.
 *
 * Input order is preserved in the output, so the caller can zip the result back against its own
 * list without matching on `id`.
 */
export function layOutMapPins(pins: readonly ProjectedMapPin[]): LaidOutMapPin[] {
  // A pin joins the first group already holding a member it collides with. Note this does NOT
  // merge two groups that a later pin happens to bridge — at these densities that costs nothing,
  // and the alternative is a union-find for a list capped at 50.
  const groups: ProjectedMapPin[][] = [];

  for (const pin of pins) {
    const existingGroup = groups.find((group) =>
      group.some(
        (member) =>
          distanceInWidthPercent(member.position, pin.position) < PIN_COLLISION_DISTANCE_PERCENT,
      ),
    );

    if (existingGroup === undefined) groups.push([pin]);
    else existingGroup.push(pin);
  }

  const positionByPinId = new Map<string, LaidOutMapPin>();

  for (const group of groups) {
    // A pin with nothing near it keeps its exact projected position. No rounding, no ring, no
    // displacement — the overwhelmingly common case must stay pixel-faithful.
    if (group.length === 1) {
      const [onlyPin] = group;
      positionByPinId.set(onlyPin.id, { id: onlyPin.id, position: onlyPin.position });
      continue;
    }

    // EVERY MEMBER MOVES, INCLUDING THE FIRST. Leaving one pin at the true spot and pushing the
    // others off it would quietly privilege whichever cluster the backend happened to sort
    // first — the ring is centred on the group's mean so the distortion is shared and symmetric.
    const groupCentre: MapCanvasPosition = {
      leftPercent:
        group.reduce((total, member) => total + member.position.leftPercent, 0) / group.length,
      topPercent:
        group.reduce((total, member) => total + member.position.topPercent, 0) / group.length,
    };

    const ringRadiusWidthPercent = ringRadiusForMemberCount(group.length);

    group.forEach((member, memberIndex) => {
      const angleRadians = RING_START_ANGLE_RADIANS + (memberIndex * 2 * Math.PI) / group.length;

      // The radius is in width-percent, so the vertical component is converted back into
      // height-percent — the inverse of the scaling in `distanceInWidthPercent`.
      const horizontalOffset = ringRadiusWidthPercent * Math.cos(angleRadians);
      const verticalOffset =
        (ringRadiusWidthPercent * Math.sin(angleRadians)) / MAP_CANVAS_ASPECT_RATIO;

      positionByPinId.set(member.id, {
        id: member.id,
        position: {
          leftPercent: roundToOutputPrecision(
            clampToPercentRange(groupCentre.leftPercent + horizontalOffset),
          ),
          topPercent: roundToOutputPrecision(
            clampToPercentRange(groupCentre.topPercent + verticalOffset),
          ),
        },
      });
    });
  }

  // Rebuilt in input order rather than returned in group order, so the caller's list and this
  // one stay index-aligned.
  return pins.map((pin) => positionByPinId.get(pin.id) ?? { id: pin.id, position: pin.position });
}
