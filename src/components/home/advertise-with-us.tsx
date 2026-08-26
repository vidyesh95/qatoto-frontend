// TRANSPORT: props-only — authored copy. Fetches nothing.
//
// NO RATES, NO FORMATS, NO MAILBOX, and all three omissions are deliberate.
//
// There is no ads or placement API anywhere in this codebase, so any inventory this page described
// would be a product that does not exist. The four Qatoto mailboxes are still an open decision in
// `todo.md`, so a contact address here would be a promise nobody is reading. And a rate card is a
// commercial commitment, not copy.
//
// What the page CAN honestly do is describe the surfaces that exist and hand the conversation to
// `/contact-us`, which is wired. When placements ship, this becomes a real page; until then it says
// so rather than implying a media kit is a click away.
import Link from "next/link";

export default function AdvertiseWithUs() {
  return (
    <main>
      <h1 className="px-6 py-6 text-xl md:px-25">Advertise with us</h1>
      <dl className="space-y-4 px-6 pb-25 text-justify text-sm md:px-25">
        <div>
          <dt>Where this stands</dt>
          <dd>
            Qatoto does not sell placements yet. There is no self-serve buying tool, no rate card
            and no ad inventory — so rather than describe a product that does not exist, this page
            sets out what the surfaces are and how to start a conversation about them.
          </dd>
        </div>

        <div>
          <dt>Who is here</dt>
          <dd>
            Qatoto is one pipeline rather than three audiences: people researching a problem, teams
            building against it in public, and buyers purchasing what those teams ship. The same
            venture appears at every stage, which is what makes the attention on it worth something
            — a viewer watching a build log is a plausible buyer of the thing being built.
          </dd>
        </div>

        <div>
          <dt>The surfaces</dt>
          <dd>
            The home feed carries videos and is where discovery happens. The store carries listings,
            search and category pages. Research and Development carries problem clusters, open roles
            and funding rounds. They are separate audiences at different stages of the same journey,
            and a placement that works on one will not automatically work on another.
          </dd>
        </div>

        <div>
          <dt>What Qatoto will not do</dt>
          <dd>
            Ranking is not for sale. The feed and the store both rank on measured signals, and a
            paid placement that quietly outranked an earned one would make every other number on the
            platform worth less. Anything that ships here will be labelled as what it is.
          </dd>
        </div>

        <div>
          <dt>Talking to us</dt>
          <dd>
            If you want to be in the room when this is designed, say so through{" "}
            <Link href="/contact-us" className="underline">
              Contact Us
            </Link>
            . Early conversations shape what gets built more than late ones do.
          </dd>
        </div>
      </dl>
    </main>
  );
}
