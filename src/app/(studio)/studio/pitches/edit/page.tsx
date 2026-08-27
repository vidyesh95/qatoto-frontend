import type { Metadata } from "next";

import PitchComposer from "@/components/studio/pitches/pitch-composer";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Edit pitch",
  description: "Edit a pitch draft",
};

// `?pitchId=` RATHER THAN `/[pitchId]`, matching `/studio/products` — a dynamic segment here
// would need `generateStaticParams` under `cacheComponents`, and there is nothing to prerender
// for a route that only ever serves the signed-in founder of one private draft.
export default async function EditPitch({
  searchParams,
}: {
  searchParams: Promise<{ pitchId?: string | string[] }>;
}) {
  const { pitchId } = await searchParams;
  // A repeated `?pitchId=` gives an array; take the first and let the component decide it is
  // not one of the caller's pitches. Passing an array through would break the lookup silently.
  const firstPitchId = Array.isArray(pitchId) ? pitchId[0] : pitchId;
  return <PitchComposer pitchId={firstPitchId} />;
}
