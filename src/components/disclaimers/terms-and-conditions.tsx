// THE GOVERNING-LAW CLAUSE USED TO DECIDE NOTHING. It read "the laws of the country in which Qatoto
// operates" — circular, because which country that is was exactly the question. It now names the
// jurisdiction and the courts from `lib/site.ts`, both of which render as visible "to be confirmed"
// placeholders until the entity is incorporated. That is the intended state: a reader can see the
// blank, which they could not before. The operator's name comes from the same file for the same
// reason, so incorporation is one edit there and none here.
//
// THESE TERMS DESCRIBE THE PLATFORM THAT SHIPS, NOT THE ONE THE MARKETING PAGES DESCRIBE. They used
// to call Qatoto "the Qatoto Video Sharing Site" and said nothing about the store, projects or
// blueprints — the parts that create obligations between people. Two positions run through every
// clause below, and both are what the code already does rather than aspirations:
//
//   - QATOTO IS THE VENUE, NEVER THE SELLER. The contract of sale is between buyer and seller,
//     payment goes to the seller or the seller's provider, freight is arranged separately, and a
//     dispute or refund here is a record — no money moves through Qatoto on either. There is no
//     returns flow, so the terms promise none. `information/how-qatoto-works.tsx` still says the
//     Store "runs operations", which contradicts this; see `todo.md` §7.
//   - PROJECT RECORDS ARE RECORDS, NOT INSTRUMENTS. The slice ledger, equity snapshots and payment
//     records are attestations of what members agreed or reported. They are not a share grant, an
//     allotment, a security or a payment, and the company the project forms is the one that issues
//     equity and answers for classification and tax.
//
// Clause 3 is the ONLY general content licence the platform states. `copyright-policy.tsx` carries
// an older video-only grant; if the two ever disagree, this one is the document with legal weight.
//
// NOTHING HERE PROMISES A MECHANISM THAT DOES NOT EXIST — no email notice of changes (nothing sends
// one), no returns process, no statutory copyright filing, no fee.

import Link from "next/link";

import {
  GOVERNING_LAW_COURTS,
  GOVERNING_LAW_JURISDICTION,
  LEGAL_ENTITY_NAME,
  SUPPORT_CONTACT_EMAIL,
} from "@/lib/site";

const TERMS_LAST_UPDATED_LABEL = "28 September 2026";

const INLINE_LINK_CLASS = "font-medium text-primary-imprint hover:underline";

export default function TermsAndConditions() {
  return (
    <main>
      <h1 className="px-6 pt-6 text-xl md:px-25">Terms and Conditions</h1>
      <p className="px-6 pt-1 pb-6 text-sm text-muted-foreground md:px-25">
        Last updated {TERMS_LAST_UPDATED_LABEL}
      </p>
      <ol className="list-inside list-decimal space-y-2 px-6 pb-25 text-justify text-sm md:px-25">
        <li>
          Who We Are and What Qatoto Is: Qatoto is operated by {LEGAL_ENTITY_NAME} ("Qatoto", "we",
          "us"). It is a platform for researching, building, funding and selling products: a store
          where independent sellers list products and a directory of factories; projects, pitches
          and research programmes where people form teams and record their work; blueprints, which
          are engineering teardowns, product launches and manufacturing case studies; and videos.
          This agreement governs your use of all of it. By using Qatoto you agree to these terms. If
          you do not agree, do not use Qatoto.
        </li>
        <li>
          Your Account: You agree to give accurate information when you create an account, to keep
          one account to one person, and to keep your sign-in details secure. You must be old enough
          to enter into a binding agreement where you live. You are responsible for what is done
          through your account. You can delete your account yourself at any time from Settings →
          Your data &amp; privacy.
        </li>
        <li>
          Your Content and the Licence You Give Us: You keep ownership of what you upload, post or
          otherwise submit — text, images, videos, files, listings, teardowns, launches, case
          studies, comments and project records. You give Qatoto a non-exclusive, worldwide,
          royalty-free licence to host, store, reproduce, display and distribute that content, and
          to change its format so that it displays properly, for the sole purpose of operating
          Qatoto. The licence ends when you delete the content or your account, except for records
          you share with other people — orders, and the records of work done on a project with
          others — which are kept after your account is deleted without your name attached, as the{" "}
          <Link href="/privacy-policy" className={INLINE_LINK_CLASS}>
            Privacy Policy
          </Link>{" "}
          describes. You are solely responsible for your content and confirm that you have the right
          to publish it.
        </li>
        <li>
          Conduct: You agree to use Qatoto only for lawful purposes and to follow the{" "}
          <Link href="/community-guidelines" className={INLINE_LINK_CLASS}>
            Community Guidelines
          </Link>{" "}
          and the{" "}
          <Link href="/copyright-policy" className={INLINE_LINK_CLASS}>
            Copyright Policy
          </Link>
          . You agree not to upload anything that is illegal, infringing, defamatory, obscene or
          otherwise objectionable; not to forge, tamper with or replay requests to our service; not
          to collect other people's information from it by automated means; and not to interfere
          with its operation or anyone else's use of it.
        </li>
        <li>
          The Store — Qatoto Is the Venue, Not the Seller: Products in the store are sold by
          independent seller organisations, not by Qatoto. A seller can trade only after a Qatoto
          moderator activates them; that check screens for abuse and is not an endorsement of the
          seller or their products. When you buy, the contract of sale is between you and the
          seller, and the seller sets the price, the description and the terms of the sale. Payment
          goes to the seller directly or through the seller's payment provider; Qatoto never holds
          the money. Shipping is arranged separately between the parties and is not charged through
          Qatoto, and a rate card published by a freight forwarder is not a booking. An order can be
          cancelled from its page while it is awaiting payment or confirmed. Refunds are issued by
          the seller, and a refund that has been requested has not necessarily been paid. Returns
          follow the seller's own policy; Qatoto does not run a returns process. A dispute opened on
          Qatoto is a record of the disagreement — Qatoto does not move money to settle it.
          Certificates shown on a factory's page are recorded as the factory supplied them and are
          not issued or checked by Qatoto, and an inquiry sent to a factory is not a quote or a
          contract. Qatoto currently charges no fee on sales; if that changes, a fee applies only
          after these terms say so.
        </li>
        <li>
          Projects, Pitches, Funding and Equity — Records, Not Instruments: Qatoto lists pitches. It
          does not vet, endorse or verify them, does not hold or transfer funds, and takes no part
          in any funding that follows; that happens on the third-party platform the founder links
          to, and between you and the founder. The records a project keeps — its contribution
          ledger, equity snapshots, compensation terms and payment records — are records of what the
          members agreed or reported. They are not a grant or allotment of shares, not a security,
          not payroll and not a payment. Issuing equity, classifying the people who work on a
          project and handling tax are the responsibility of the company the project forms, not of
          Qatoto. Contributions you log may be assessed automatically, including by AI; you can
          dispute an assessment within the window shown to you, a person reviews the dispute, and an
          assessment affects the project's equity records only, never cash. Contributions and cash
          commitments recorded in a research programme are records of intent, not equity and not
          payment. Nothing on Qatoto is legal, tax or investment advice.
        </li>
        <li>
          Blueprints: A teardown is its publisher's own survey of a commercially available unit they
          acquired lawfully. When publishing one, the publisher confirms that they obtained the unit
          lawfully, that everything in it is their own measurement, that they used nothing
          confidential, and that they worked it out independently — and the publisher, not Qatoto,
          is responsible for those statements. Qatoto does not search patents, give clearance
          opinions or verify a publisher's account of their own work. The files published with a
          teardown belong to their publisher, and whether you may use them to make anything is a
          question for you and the relevant rights holders. The statements made with a product
          launch or a case study are its writer's. If you believe a blueprint infringes your rights,
          use the report control on it or follow the{" "}
          <Link href="/copyright-policy" className={INLINE_LINK_CLASS}>
            Copyright Policy
          </Link>
          ; either way your notice reaches a person, and it is not a formal statutory filing.
        </li>
        <li>
          Third-Party Services: Parts of Qatoto rely on services run by others — videos play from
          YouTube, payments are taken by the seller's payment provider, and funding happens on the
          platforms founders link to. Those services have their own terms, and Qatoto does not
          control them or answer for them.
        </li>
        <li>
          Moderation, Suspension and Ending This Agreement: Qatoto may remove content, and may
          suspend or close an account, that breaks these terms or the rules they refer to. You may
          stop using Qatoto at any time, and deleting your account ends this agreement for you,
          except for the parts that by their nature continue — the licence over shared records in
          clause 3, and clauses 10 to 13.
        </li>
        <li>
          Disclaimer of Warranties: Qatoto is provided on an "as is" and "as available" basis. To
          the extent the law allows, Qatoto makes no representations or warranties of any kind,
          express or implied, as to the operation of Qatoto, the content available through it, or
          the products, sellers, factories, projects and people you find on it. You agree that your
          use of Qatoto is at your sole risk.
        </li>
        <li>
          Limitation of Liability: To the extent the law allows, Qatoto will not be liable for any
          damages of any kind arising from the use of Qatoto, including but not limited to direct,
          indirect, incidental and punitive damages, or from any dealing between you and another
          user, seller, factory or funding platform.
        </li>
        <li>
          Indemnification: You agree to indemnify and hold Qatoto harmless from any claims, damages
          and expenses, including reasonable attorney's fees, arising from your use of Qatoto or
          from content you publish on it.
        </li>
        <li>
          Governing Law: This agreement is governed by the laws of {GOVERNING_LAW_JURISDICTION}, and
          you and Qatoto submit to the exclusive jurisdiction of {GOVERNING_LAW_COURTS} for any
          dispute arising out of it. If the law of the country you live in gives you rights as a
          consumer that cannot be taken away by an agreement, this clause does not take them away.
        </li>
        <li>
          Changes to the Agreement: Qatoto may change these terms. When it does, the revised terms
          are posted on this page with a new "Last updated" date, and they apply from that date.
          Your continued use of Qatoto after that date means you accept the revised terms.
        </li>
        <li>
          Contact: Questions about these terms can be sent to{" "}
          <a href={`mailto:${SUPPORT_CONTACT_EMAIL}`} className={INLINE_LINK_CLASS}>
            {SUPPORT_CONTACT_EMAIL}
          </a>
          .
        </li>
      </ol>
    </main>
  );
}
