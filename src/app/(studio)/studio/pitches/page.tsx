import type { Metadata } from "next";

import StudioPitchesPage from "@/components/studio/pitches/pitches-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Pitches",
  description: "Publish a venture to people who might fund it",
};

// GRADUATED FROM `StudioPlannedPage` — but NOT into what that placeholder promised, and the
// roadmap summary changed with it. The old line read "Pitches you sent and received", which
// implies sending a pitch TO a named person; no such primitive exists, and building one would
// have needed an investor entity, KYC and a securities answer. `todo.md` recorded this route as
// blocked on a DEFINITION rather than on code, and it was right.
//
// What shipped instead is the Kickstarter/YC-demo-day reading: a founder publishes a venture to
// an audience of funders, Qatoto LISTS it, and the money happens somewhere else entirely —
// `external_funding_url` points at a licensed third party the founder chose. Qatoto holds no
// funds, takes no fee and vets only for spam, scams and illegal content.
export default function StudioPitches() {
  return <StudioPitchesPage />;
}
