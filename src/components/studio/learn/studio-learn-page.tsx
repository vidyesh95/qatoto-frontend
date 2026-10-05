// TRANSPORT: props-only — authored copy over links. Fetches nothing.
//
// THE STUDIO'S GUIDE, GRADUATED FROM `StudioPlannedPage`.
//
// One page, anchored, by decision: every section carries a stable `id` so a Studio surface can
// deep-link to the part a reader is stuck on (`/studio/learn#listings`) without a second route to
// keep in sync. Those in-context links are NOT wired yet — that is a separate change — so the ids
// are a contract with future callers and must not be renamed casually.
//
// ⚠️ EVERY CLAIM HERE IS ONE THE APP ALREADY MAKES. Each row was written from copy that ships on
// the surface it describes, and that surface is the authority: when a flow changes, its row here
// changes in the same edit. Variant options (A26) were the first case: the variants row under
// `listings` was rewritten in the change that shipped them.
//
// ⚠️ EVERY `href` MUST BE A ROUTE THAT WORKS, the `site-capabilities.ts` rule. A reader arrives here
// already stuck, and a link to a `StudioPlannedPage` stub would tell them "not built yet" twice.
// `/studio/subtitles` is the one stub left, which is why YouTube's captions are explained below in
// prose with no link.
//
// ⚠️ THE UPLOAD MODAL'S CHECKS STEP IS NOT MENTIONED, ON PURPOSE. It simulates a pass that always
// lands on "No issues found" (`upload/steps/checks-step.tsx`), so describing it as a copyright or
// content scan would be this page inventing a safeguard.
//
// WORDING, which binds here as it does everywhere:
//  - A submission is "sent for review", never "published". Product listings are the one honest
//    exception — they go live when you publish them, with no moderator in between.
//  - Nothing here says a backer "paid", "funded" or "escrowed" anything. Qatoto holds no money.
//  - "Review" is a moderator screening for spam, scams and illegal content. It is never a judgement
//    of merit, and no copy may imply Qatoto vetted or endorsed anything.
import Link from "next/link";
import type { ReactNode } from "react";

/** One thing a reader is trying to do, and how the Studio does it. */
interface LearnRow {
  readonly task: string;
  readonly answer: ReactNode;
}

/** One anchored section. `id` is a deep-link target — see the header before renaming one. */
interface LearnSection {
  readonly id: string;
  readonly heading: string;
  readonly intro: string;
  readonly rows: readonly LearnRow[];
}

/** One step of a "Start here" path. */
interface StartHereStep {
  readonly label: string;
  readonly href: string;
}

interface StartHerePath {
  readonly reader: string;
  readonly steps: readonly StartHereStep[];
}

function GuideLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <Link href={href} className="text-foreground underline">
      {children}
    </Link>
  );
}

const START_HERE_PATHS: readonly StartHerePath[] = [
  {
    reader: "You make videos",
    steps: [
      { label: "Create", href: "/studio" },
      { label: "Customize", href: "/studio/customize" },
      { label: "My Videos", href: "/studio/videos" },
      { label: "Analytics", href: "/studio/analytics" },
    ],
  },
  {
    reader: "You sell goods or services",
    steps: [
      { label: "Company profile", href: "/studio/factory-profile" },
      { label: "My Products", href: "/studio/products" },
      { label: "Services", href: "/studio/services" },
      { label: "Requests to quote", href: "/studio/rfqs" },
      { label: "Sales", href: "/studio/sales" },
      { label: "Earn", href: "/studio/earn" },
    ],
  },
  {
    reader: "You are building a product",
    steps: [
      { label: "My Teardowns", href: "/studio/blueprints" },
      { label: "My Launches", href: "/studio/launches" },
      { label: "Pitches", href: "/studio/pitches" },
      { label: "Team", href: "/studio/team" },
      { label: "Funding", href: "/studio/funding" },
    ],
  },
];

const LEARN_SECTIONS: readonly LearnSection[] = [
  {
    id: "videos",
    heading: "Videos and your channel",
    intro:
      "Every video on Qatoto is a YouTube link. YouTube holds the file and plays it; Qatoto adds the details, the links and the people around it.",
    rows: [
      {
        task: "Add a video",
        answer: (
          <>
            Paste a YouTube link on <GuideLink href="/studio">Create</GuideLink> — watch, Shorts and
            youtu.be links all work. Uploading a file is not available, because Qatoto does not host
            video yet. Four steps follow: Details, Video elements, Checks and Visibility. Closing
            the window part-way saves the video as a private draft.
          </>
        ),
      },
      {
        task: "Decide who can watch it",
        answer: (
          <>
            Visibility is Private (only you), Unlisted (anyone with the link) or Public (everyone),
            and you can schedule it. &ldquo;Save &amp; publish&rdquo; does not change visibility on
            its own: a private video stays hidden even once published. You can change visibility at
            any time from <GuideLink href="/studio/videos">My Videos</GuideLink>.
          </>
        ),
      },
      {
        task: "A video says “Verifying…”",
        answer: (
          <>
            Qatoto is confirming the link with YouTube, and publishing unlocks once it is verified.
            &ldquo;Unavailable&rdquo; means YouTube would not confirm the video. A scheduled video
            does not appear on the homepage until it is published.
          </>
        ),
      },
      {
        task: "Add a transcript or chapters",
        answer: (
          <>
            Both are on the Video elements step: upload an .srt or .vtt file, or paste the text.
            Captions inside the player belong to YouTube and are managed there.
          </>
        ),
      },
      {
        task: "Credit the people who worked on a video",
        answer: (
          <>
            Add credits on the Video elements step and follow them in{" "}
            <GuideLink href="/studio/collaborations">Collaborations</GuideLink>. Only the person
            named can confirm a credit, and a credit grants no access: it does not let anyone sign
            in, edit a video or act on your account.
          </>
        ),
      },
      {
        task: "Group videos, read comments, edit your channel",
        answer: (
          <>
            <GuideLink href="/studio/playlists">Playlists</GuideLink> are collections viewers can
            play in order. <GuideLink href="/studio/comments">Comments</GuideLink> lists every
            comment on your videos, newest first; removing one is done from the video&apos;s own
            thread. <GuideLink href="/studio/customize">Customize</GuideLink> holds the description
            and links visitors see in your channel&apos;s About panel.
          </>
        ),
      },
      {
        task: "Something was decided about one of your videos",
        answer: (
          <>
            <GuideLink href="/studio/copyright">Copyright</GuideLink> lists decisions only. Qatoto
            never shows you who reported a video, and a hidden video still shows in your Studio.
          </>
        ),
      },
      {
        task: "Your view counts do not match YouTube",
        answer: (
          <>
            <GuideLink href="/studio/analytics">Analytics</GuideLink> counts reach and engagement on
            Qatoto. YouTube counts its own views, so the two will not match.
          </>
        ),
      },
    ],
  },
  {
    id: "listings",
    heading: "Listings",
    intro:
      "A listing is a product on the Qatoto Store. It is built in one editor and goes live when you publish it — there is no moderator step for listings.",
    rows: [
      {
        task: "Create a listing",
        answer: (
          <>
            Start from <GuideLink href="/studio/products">My Products</GuideLink>. The editor runs
            through eleven steps: Product Identity, Images &amp; Media, Description, Specifications,
            Highlights, Documents, Pricing &amp; Inventory, Variants, Customization, Related
            products, and Review &amp; Publish. &ldquo;Save Draft&rdquo; keeps it private;
            &ldquo;Publish Listing&rdquo; puts it live on the store.
          </>
        ),
      },
      {
        task: "Your listing will not publish",
        answer: (
          <>
            A listing needs a title, a price, images, a sample price, the package size and weight,
            and the fields its category requires. Package size and weight are required because
            freight is rated on the shipped package. The editor lists what is still missing.
          </>
        ),
      },
      {
        task: "Sell sizes, colours or other versions",
        answer: (
          <>
            Add them on the Variants step. Variants are optional — leave the step empty and the
            listing sells as one thing. Name up to three options, such as Size and Colour, and every
            combination of their values becomes a variant; switch off any combination you do not
            sell. Or list versions by name with no options. Each variant has its own price and
            stock, a listing can have up to 50, and a buyer must choose one before adding the
            listing to a cart.
          </>
        ),
      },
      {
        task: "Price for bulk orders and samples",
        answer: (
          <>
            Pricing tiers offer a lower unit price for larger orders, each with its own minimum
            quantity. A refundable sample means its price comes back as credit against the
            buyer&apos;s first bulk order, and you set how many samples one order may take, from 1
            to 20.
          </>
        ),
      },
      {
        task: "Let buyers personalise an order, or attach documents",
        answer: (
          <>
            Customization slots ask buyers for a choice or a file. Every slot is optional to answer;
            required slots are not offered yet. Documents take up to five PDFs of 25 MB each.
          </>
        ),
      },
    ],
  },
  {
    id: "sets-and-services",
    heading: "Sets and Services",
    intro:
      "Both are sent for review before anybody sees them. A moderator screens for spam, scams and illegal content, and decides from there.",
    rows: [
      {
        task: "Offer products together as a set",
        answer: (
          <>
            Build one in <GuideLink href="/studio/pathways">Sets</GuideLink>; the whole set saves
            together and goes to a moderator with &ldquo;Send for review&rdquo;. Once a set is
            published it cannot be edited or taken down, so give it an end date.
          </>
        ),
      },
      {
        task: "Offer a service",
        answer: (
          <>
            <GuideLink href="/studio/services">Services</GuideLink> saves a draft first. It is not
            listed until you submit it and a moderator approves it. A price range is optional and is
            not a quote.
          </>
        ),
      },
      {
        task: "Deliver a service a buyer ordered",
        answer: (
          <>
            Agreed work is tracked in{" "}
            <GuideLink href="/service-engagements">Service engagements</GuideLink>, with its
            milestones and deliveries. Each service on an order finishes on its own — accepting one
            does not complete anything else.
          </>
        ),
      },
    ],
  },
  {
    id: "selling",
    heading: "Selling and operations",
    intro:
      "Orders, quotes and shipments. Qatoto records what each side did; it is not part of the money.",
    rows: [
      {
        task: "Handle an order you received",
        answer: (
          <>
            <GuideLink href="/studio/sales">Sales</GuideLink> lists orders you have received and
            what still needs to go out. Each order opens on its terms, lines and fulfilment. When a
            buyer pays you directly, each of you records your half of the payment; Qatoto is not
            part of the transfer and can only record what each of you says happened.
          </>
        ),
      },
      {
        task: "Ship an order in parts",
        answer: (
          <>
            Leave a line at zero to ship it later — an order can go out in several shipments. Every
            shipment across your orders, leg by leg, is in{" "}
            <GuideLink href="/studio/logistics">Logistics</GuideLink>.
          </>
        ),
      },
      {
        task: "Answer a request to quote",
        answer: (
          <>
            Requests appear in <GuideLink href="/studio/rfqs">Requests to quote</GuideLink>, either
            because the buyer invited you or because your organization matched. The quote form runs
            through Goods, Services, Terms, Documents and Review. Nothing is offered to the buyer
            until you submit, and submitting freezes that revision for good; the buyer may then
            accept it, which creates an order.
          </>
        ),
      },
      {
        task: "A quote you started will not let you price another",
        answer: (
          <>
            Only one unsubmitted revision can exist at a time. Find it in{" "}
            <GuideLink href="/studio/quotes">Your quotes</GuideLink>, which includes the ones you
            have not submitted, and submit it first.
          </>
        ),
      },
      {
        task: "Answer reviews and questions",
        answer: (
          <>
            In <GuideLink href="/studio/reviews">Reviews</GuideLink> you can answer each review
            once, and revise that answer once within 30 days.{" "}
            <GuideLink href="/studio/questions">Questions</GuideLink> lists questions on your
            listings, oldest first. An answer appears on the listing under your organization&apos;s
            name and cannot be revised — withdraw it and answer again.
          </>
        ),
      },
      {
        task: "Be found by buyers looking for a manufacturer",
        answer: (
          <>
            <GuideLink href="/studio/factory-profile">Company profile</GuideLink> is what buyers see
            in the directory and on your storefront. Turning inquiries off keeps you in the
            directory; it does not hide you. Buyers who have written to you are in{" "}
            <GuideLink href="/studio/factory-inquiries">Manufacturing inquiries</GuideLink>; drafts
            they have not sent are not.
          </>
        ),
      },
      {
        task: "Publish your freight rates",
        answer: (
          <>
            <GuideLink href="/studio/logistics/rate-cards">Freight lanes</GuideLink> publishes the
            lanes you already sell. Qatoto charges no freight and books nothing. A rate card in
            force is frozen: to change it, publish a new card.
          </>
        ),
      },
      {
        task: "See what you have earned",
        answer: (
          <>
            <GuideLink href="/studio/earn">Earn</GuideLink> shows what has settled to you, what came
            back, and what nobody has counted yet. Profit and margin are not shown, because nothing
            on Qatoto records what you paid for your goods.
          </>
        ),
      },
      {
        task: "Something is wrong and you are stuck",
        answer: (
          <>
            <GuideLink href="/studio/support">Support</GuideLink> first points you at the page that
            already records the problem. If none fits, open a case there and a person will read it.
          </>
        ),
      },
    ],
  },
  {
    id: "product-journey",
    heading: "Product journey",
    intro:
      "From documenting a product to finding the people and money to build one. Teardowns, launches, case studies and pitches are sent for review, and the list for each in the Studio is where the outcome appears.",
    rows: [
      {
        task: "Publish a teardown",
        answer: (
          <>
            Start one from <GuideLink href="/studio/blueprints">My Teardowns</GuideLink>. It runs
            through five steps — Subject and provenance, Media and files, Parts, Materials, and
            Review and attest — and you attach files in the Media and files step. Four statements
            must all be true before you can submit: you obtained the unit lawfully, the measurements
            are your own, nothing is confidential, and you worked it out independently. A submitted
            teardown is not public; a moderator decides whether it is published, and nothing will
            email you — My Teardowns is where the answer appears.
          </>
        ),
      },
      {
        task: "Announce a launch, or write up a lesson",
        answer: (
          <>
            <GuideLink href="/studio/launches">My Launches</GuideLink> and{" "}
            <GuideLink href="/studio/case-studies">My Case Studies</GuideLink> each start a new one
            and list what you have sent. Both wait for a moderator. Approved launches do not appear
            on the public showcase pages yet.
          </>
        ),
      },
      {
        task: "Pitch a venture",
        answer: (
          <>
            <GuideLink href="/studio/pitches">Pitches</GuideLink> works for a venture you founded
            and published. Qatoto lists your pitch and links out to where funding happens, so the
            funding link must start with https://. Review checks for spam, scams and illegal
            content, not whether the venture is a good one. Money that reached you off Qatoto can be
            recorded on the pitch; Qatoto does not handle or verify it, and the other party confirms
            it before it shows.
          </>
        ),
      },
      {
        task: "Find people to build with",
        answer: (
          <>
            <GuideLink href="/studio/team">Team</GuideLink> shows who wants to build with you across
            your ventures. What a role advertises is an offer; equity itself is earned through
            verified work.
          </>
        ),
      },
      {
        task: "Follow funding commitments",
        answer: (
          <>
            <GuideLink href="/studio/funding">Funding</GuideLink> is read-only. Its amounts are
            commitments, not money received — Qatoto holds no funds. Changes are made on each
            venture&apos;s own funding tab.
          </>
        ),
      },
      {
        task: "Tell Qatoto what would make the Studio better",
        answer: (
          <>
            <GuideLink href="/studio/feedback">Feedback</GuideLink> is read by a person, but nothing
            sends a reply. For anything blocking you, use{" "}
            <GuideLink href="/studio/support">Support</GuideLink> instead.
          </>
        ),
      },
    ],
  },
];

/** The closing list. Said once, here, rather than repeated under every section. */
const WHAT_QATOTO_DOES_NOT_DO: readonly string[] = [
  "Qatoto holds no money. There is no escrow, so nothing here can release, reverse or refund a payment.",
  "Qatoto does not vet, endorse or verify the people, products or ventures listed here.",
  "Video lives on YouTube. Qatoto stores a link and the details around it, never the file.",
  "Review means a moderator screening for spam, scams and illegal content — never a judgement of whether something is good.",
];

export default function StudioLearnPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-foreground">Learn</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        How each part of the Studio works, by what you are trying to do. For the pipeline itself —
        idea, team, funding, build, sell — read{" "}
        <GuideLink href="/how-qatoto-works">How Qatoto Works</GuideLink>.
      </p>

      <section aria-labelledby="start-here" className="mt-6 max-w-3xl">
        <h2
          id="start-here"
          className="text-xs font-medium tracking-eyebrow text-muted-foreground uppercase"
        >
          Start here
        </h2>
        <dl className="mt-2 divide-y divide-border rounded-xl border border-border">
          {START_HERE_PATHS.map((path) => (
            <div key={path.reader} className="px-4 py-3">
              <dt className="text-sm font-medium text-foreground">{path.reader}</dt>
              <dd className="mt-1">
                <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
                  {path.steps.map((step, stepIndex) => (
                    <li key={step.href} className="flex items-center gap-x-1">
                      {stepIndex > 0 && <span aria-hidden="true">→</span>}
                      <GuideLink href={step.href}>{step.label}</GuideLink>
                    </li>
                  ))}
                </ol>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-label="On this page" className="mt-6 max-w-3xl">
        <p className="text-xs font-medium tracking-eyebrow text-muted-foreground uppercase">
          On this page
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LEARN_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-foreground underline">
                {section.heading}
              </a>
            </li>
          ))}
          <li>
            <a href="#what-qatoto-does-not-do" className="text-foreground underline">
              What Qatoto does not do
            </a>
          </li>
        </ul>
      </nav>

      {LEARN_SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-heading`}
          className="mt-8 max-w-3xl scroll-mt-20"
        >
          <h2 id={`${section.id}-heading`} className="text-sm font-semibold text-foreground">
            {section.heading}
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{section.intro}</p>
          <dl className="mt-3 divide-y divide-border rounded-xl border border-border">
            {section.rows.map((row) => (
              <div key={row.task} className="px-4 py-3">
                <dt className="text-sm font-medium text-foreground">{row.task}</dt>
                <dd className="mt-1 text-sm leading-5 text-muted-foreground">{row.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section
        id="what-qatoto-does-not-do"
        aria-labelledby="what-qatoto-does-not-do-heading"
        className="mt-8 max-w-3xl scroll-mt-20"
      >
        <h2 id="what-qatoto-does-not-do-heading" className="text-sm font-semibold text-foreground">
          What Qatoto does not do
        </h2>
        <ul className="mt-2 list-inside list-disc space-y-1 rounded-xl bg-muted px-4 py-3 text-sm leading-5 text-muted-foreground">
          {WHAT_QATOTO_DOES_NOT_DO.map((statement) => (
            <li key={statement}>{statement}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
