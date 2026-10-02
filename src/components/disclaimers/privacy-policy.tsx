// THE ART. 13 GAPS ARE CLOSED, and this comment is the record of what "closed" means here.
//
// This document named no controller, no lawful basis, no rights, no supervisory authority and no
// transfer basis, and never used the word "cookie" — while `account/menus/location-menu.tsx` offers
// 108 browse countries including every EU/EEA member. The sections below are written from what the
// platform ACTUALLY does: the inventory in `account/panels/data-and-privacy-panel.tsx`, the
// retention constants the backend prunes on, and the one contact address in `lib/site.ts`. Nothing
// here promises a control that does not exist.
//
// THE ENTITY IS A PLACEHOLDER, DELIBERATELY VISIBLE. `LEGAL_ENTITY_NAME` and its address render as
// bracketed "to be confirmed" text until incorporation completes. That is the intended state: a
// blank a reader can see beats a plausible-sounding company name in a legal document.
//
// COOKIES ARE STILL ESSENTIAL-ONLY, BUT "NO THIRD-PARTY SCRIPT" STOPPED BEING TRUE. This comment used
// to say that the day any embedded third-party script shipped, the cookie section would become false
// and a consent banner would be part of that change. Four have shipped without one: the YouTube
// player, the Google Maps embed on /contact-us, OpenFreeMap tiles on the problem map and Razorpay
// checkout. The section below now NAMES them instead of denying them, and it no longer says there
// is nothing to ask consent for. Whether each needs click-to-load or a banner is open in `todo.md` §7.
//
// THE RECIPIENTS ARE NAMED, NOT CATEGORISED. "Service providers such as hosting and payment
// processing" told a reader nothing they could act on. When a provider changes — the frontend is on
// Vercel today and is planned to move to Cloudflare — the Sharing section changes in the same edit.
//
// THE INVENTORY IN `account/panels/data-and-privacy-panel.tsx` MIRRORS THE COLLECTION SECTION. A
// category added here and not there makes the policy's "same inventory" sentence false.

import {
  LEGAL_ENTITY_NAME,
  LEGAL_ENTITY_REGISTERED_ADDRESS,
  PRIVACY_CONTACT_EMAIL,
} from "@/lib/site";
import { PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL } from "@/lib/privacy-request";

const PRIVACY_POLICY_LAST_UPDATED_LABEL = "28 September 2026";

export default function PrivacyPolicy() {
  return (
    <main>
      <h1 className="px-6 pt-6 text-xl md:px-25">Privacy Policy</h1>
      <p className="px-6 pt-1 pb-6 text-sm text-muted-foreground md:px-25">
        Last updated {PRIVACY_POLICY_LAST_UPDATED_LABEL}
      </p>
      <dl className="space-y-4 px-6 pb-25 text-justify text-sm md:px-25">
        <div>
          <dt>Introduction</dt>
          <dd>
            Qatoto is a platform for researching, developing, funding and selling products, and it
            is committed to protecting the privacy of the people who use it. We have created this
            policy to explain what information we collect, why we collect it, how long we keep it,
            what rights you have over it, and what measures we take to protect it.
          </dd>
        </div>
        <div>
          <dt>Who we are</dt>
          <dd>
            {LEGAL_ENTITY_NAME}, of {LEGAL_ENTITY_REGISTERED_ADDRESS}, operates Qatoto and is the
            controller of the personal data described in this policy — meaning we are the ones who
            decide why and how it is used, and the ones answerable for it. You can reach us about
            anything in this document at {PRIVACY_CONTACT_EMAIL}.
          </dd>
        </div>
        <div>
          <dt>Information Collection</dt>
          <dd>
            We collect information that you provide to us directly, such as when you create an
            account, upload videos, list or buy a product, or take part in a project. This
            information may include your name, email address, profile picture, handle, the location
            shown on your profile, and how you sign in — a password stored only as a hash we cannot
            reverse, your passkeys, and any Google or GitHub account you link. We also collect
            information about your use of the site: the videos you upload and view, the comments and
            forum posts you make, the products you view, your cart and your orders, the projects you
            found, join or apply to, the effort you log, and the records of equity, pay and payments
            that follow from them. Each signed-in device is recorded with the IP address and browser
            it signed in from.
            <br />
            <br />
            Some parts of Qatoto collect more, and only from the people who use them. If you sell,
            we hold the business details you give us — including registration and tax numbers, which
            we store encrypted — and the documents you upload as evidence of your business. If you
            buy, we hold the delivery address you give and any artwork you upload to customise a
            product, and your seller sees both. If you contact a factory, we hold the inquiry. If
            you log work on a project, we hold your daily updates — their text and any video link —
            the transcript and claims drawn from them, and any receipt photos you upload as
            evidence. If you post a pitch or record how one was funded, we hold it, including the
            name of the funder you type. If you report a problem on the problem map, we hold the
            place you describe and, if you drop a pin, a position your browser rounds to about 110
            metres before sending it, and any photos you attach — which anyone can see on the
            problem map, have the location your camera recorded removed, and are deleted two years
            after you add them, 90 days after the problem is marked fixed, or when you erase your
            account, whichever comes first. If you publish a teardown, a product launch or a case
            study, we hold it and the statements you make with it — and if you withhold a company's
            name from a case study, our moderators still see it, though readers never do. If you
            send an intellectual property claim about a teardown, we hold your name, organisation,
            email, your standing and what you claim: our moderators see them, the teardown&rsquo;s
            publisher never does, and they are kept while the claim is open and for six years after
            it is answered, then deleted, even if you erase your account sooner. If you list
            yourself in the cofounder directory, we hold that profile. The same inventory, in the
            same words, is in your account under Settings → Your data &amp; privacy.
          </dd>
        </div>
        <div>
          {/* ADDED WITH THE WATCH-TIME SURFACE. Three rollup tables record how long and at what hour
              each signed-in account watches, and this document is the one with legal weight — the
              in-app inventory at Settings &rarr; Your data &amp; privacy mirrors it, not the other
              way round. The windows below are the retention periods the platform actually prunes
              on. The wider Art. 13 gaps this block once named as outstanding — controller identity,
              lawful basis, enumerated rights — were closed on 2026-08-19 and are the sections
              above and below. */}
          <dt>Product Pages You Look At</dt>
          <dd>
            When you open a product page in the store we record which listing it was, roughly how
            long the page was open, and which day it was — so that a seller can see how many people
            looked at a listing and how many of those went on to order. Unlike watch activity below,
            this is recorded <strong>whether or not you are signed in</strong>, because a shop with
            no count of anonymous visitors has no idea how many people it turned away. If you are
            signed in the record is attached to your account, and you can download it from Settings
            &rarr; Your data &amp; privacy; if you are not, there is no account to attach it to. We
            also keep a short-lived scrambled code and a scrambled, blunted form of your network
            address alongside it, so that one person reloading a page a hundred times does not read
            as a hundred shoppers — neither can be turned back into you, and we cannot read them
            back either. How long the page was open is measured by us, not reported by your browser,
            so it cannot be inflated.
          </dd>

          <dt>Watch Activity and How Long We Keep It</dt>
          <dd>
            When you are signed in, we record how long you watch and which hour of which day you
            watched, so that we can show you your own watch time and understand when the platform is
            busy. We keep the hour-by-hour record for 90 days and the per-day totals for about 25
            months, after which they are deleted. We also keep an hour-by-hour total for the whole
            platform, which carries no account identifier and cannot be traced back to you. Watching
            while signed out is not recorded in any of these.
          </dd>

          {/* ADDED WITH THE SEARCH LOG (2026-09-28), which is what makes "Everyone is searching
              for" real. Every clause is a rule the backend enforces: `search-query-log.ts` for what
              is never kept, `recompute-trending-searches` for the 30 days and the floor. */}
          <dt>Searches</dt>
          <dd>
            When you search for videos, we keep the words you searched for 30 days — not your
            account, your name or your network address, only a code that changes every week — so we
            can show what many people are searching for. A search containing an email address, a
            phone number or a web address is not kept. A term is shown to others only once enough
            different people have searched for it, and moderators can hide one. Because nothing
            links a search to your account, we cannot include your searches in a download or delete
            them one person at a time; they are deleted after 30 days.
          </dd>
        </div>
        <div>
          <dt>Use of Information</dt>
          <dd>
            The information we collect is used to provide and improve the services we offer, to
            communicate with you, and to personalize your experience on the site. We send email only
            about your account and what you do on Qatoto — we send no newsletters or marketing — and
            we use your information to respond to your questions and requests. We may also use
            aggregated and anonymized information to perform research and analysis, to create
            reports, and to support other business purposes.
          </dd>
        </div>
        <div>
          <dt>Why We Are Allowed to Use It</dt>
          <dd>
            Different information is held for different reasons, and the reason matters because it
            decides what you can ask us to do about it. We hold your account details, your orders
            and your project records because we need them to give you the service you asked for —
            without them there is no account, no order and no project. We hold sign-in device
            records, moderation decisions and security logs because we have a legitimate interest in
            keeping the platform safe and in being able to show what happened, and we hold watch
            activity for the same reason: to show you your own watch time and to understand when the
            platform is busy. Where we ask you for permission — for anything optional — that
            permission is the basis, and you can withdraw it at any time without affecting what we
            did before you did. Some records are kept because the law requires us to keep them, and
            those are described below.
          </dd>
        </div>
        <div>
          <dt>Automated Assessment of Your Work</dt>
          <dd>
            When you post a daily update on a project, Google Gemini reads it, transcribes any video
            it links to, and draws out the claims it makes about the work you did. When you claim
            effort, our systems then check that claim against its evidence — the times on your
            receipt photos, the commits in a GitHub repository you have chosen to connect, and the
            links you gave — and reach a verdict. That verdict can change your share of the
            project's equity records; it never moves money. A claim the checks cannot confirm is
            flagged for a person to look at rather than rejected, a failed check awards nothing
            rather than guessing, and every verdict opens a 24-hour window in which you and your
            team can dispute it before anything is written to the project's records. You can also
            ask a person to review any verdict about you by writing to {PRIVACY_CONTACT_EMAIL}.
          </dd>
        </div>
        <div>
          <dt>The AI Assistant</dt>
          <dd>
            AI Assist Mode is off unless you turn it on, and you can turn it on without an account.
            When your browser can run Google&apos;s Gemini Nano model itself (current desktop
            Chrome), your questions are answered on your device and nothing you type leaves it. When
            it cannot, chat is available only to accounts with Premium AI, which Qatoto turns on per
            account; for those, your conversation so far, the page you are on and any notes you
            asked the assistant to remember are sent to us and to Google&apos;s Gemini model to
            produce a reply. We do not store those messages, and the notes stay in your browser,
            where the &ldquo;Your data &amp; privacy&rdquo; panel can erase them. We do record
            whether your account has Premium AI, when it was turned on or off, and which staff
            member did it. The assistant can be wrong, and nothing it says changes your account, an
            order or a payment.
          </dd>
        </div>
        <div>
          <dt>Sharing of Information</dt>
          <dd>
            We share your information with the service providers who run Qatoto for us, and only for
            the job each one does: Vercel, which serves this website; Amazon Web Services, which
            runs our servers; Aiven, which hosts our database; Cloudinary, which stores and serves
            images; Backblaze, which stores research-paper files and the data exports you request;
            Brevo, which sends our email; and Google, whose Gemini model transcribes daily updates
            and answers AI assistant questions for Premium AI accounts when their browser cannot,
            both as described above. If you sign in with Google or GitHub, or connect a GitHub
            repository to a project, that provider exchanges information with us to make it work.
            When you report a problem, the place you describe is sent to OpenStreetMap's Nominatim
            service to find its country and region. When you pay for an order, the seller's payment
            provider receives what it needs to take the payment.
            <br />
            <br />
            Other people on Qatoto see some of your information because that is the point of the
            feature: a seller sees the orders you place with them and where to deliver them, a buyer
            sees the seller they bought from, project members see the records of the project they
            share with you, and anything you publish is public. We may also share information with
            law enforcement or other government agencies when required by law, or when necessary to
            protect the safety, rights, or property of Qatoto, its users, or others. We never sell
            or rent your personal information.
          </dd>
        </div>
        <div>
          <dt>Where Your Information Goes</dt>
          <dd>
            Qatoto is used from many countries, and the service providers who host it and help us
            run it may be located outside the country you are in — which means your information can
            be transferred across borders. Where that happens from the European Economic Area or the
            United Kingdom, we rely on the transfer mechanisms the law provides for it, such as
            standard contractual clauses or a finding that the destination country offers adequate
            protection. Write to {PRIVACY_CONTACT_EMAIL} if you want to know which mechanism applies
            to a particular transfer.
          </dd>
        </div>
        <div>
          <dt>Cookies and Storage on Your Device</dt>
          <dd>
            The only cookies we set are the ones that keep you signed in — without them every page
            would ask you to sign in again. We also keep a single entry in your browser's local
            storage, under the name <code>qatoto.browser-preferences</code>, holding your language,
            your browse country, whether AI assist is on, where the assistant sits and its size and
            speed, and the notes you asked it to remember. We never store that entry; the notes
            alone are sent with a question when your browser cannot run the assistant itself, as
            described above. We run no analytics or advertising scripts.
            <br />
            <br />
            Some pages load content from other companies, and when they do, your browser contacts
            that company directly: it receives your IP address and browser details, and it may set
            its own cookies under its own policy. Those pages are video players, which load from
            YouTube; the map on the contact page, which loads from Google Maps; the problem map,
            whose map tiles load from OpenFreeMap; and order payment, which loads the payment
            provider's checkout. Video stills on some pages also load straight from YouTube. Nothing
            is loaded from these companies on pages that show none of their content.
          </dd>
        </div>
        <div>
          <dt>Your Rights</dt>
          <dd>
            You can ask us for a copy of the personal data we hold about you, and to receive it in a
            commonly used, machine-readable format. You can ask us to correct anything inaccurate,
            to delete your account and erase your identity, or to restrict what we do with your
            information while a question about it is being resolved. You can object to us using your
            information where we rely on our legitimate interests, and you can withdraw any
            permission you have given us.{" "}
            <strong>
              Getting a copy of your data and deleting your account are both self-serve and
              immediate
            </strong>{" "}
            from Settings → Your data &amp; privacy: the download is prepared for you in the
            background, and a deletion takes effect the moment you confirm it — you then have thirty
            days to change your mind, and simply signing in again is all it takes. The remaining
            rights — correction, restriction, and objection — are made by writing to{" "}
            {/* A REAL LINK, NOT PLAIN TEXT. These three rights have no endpoint, so the
                mailbox IS the route — and rendering the only route as something you have to
                select and copy is a worse answer than the panel gives for the two rights
                that do have buttons. */}
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="underline">
              {PRIVACY_CONTACT_EMAIL}
            </a>
            , and we answer those within {PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL}. We may have to ask
            you to confirm who you are first, so that we do not act on someone else's say-so about
            your account. Some records — the ones we are required to keep, and the shared records of
            work done on a project with other people — survive the deletion of an account, but they
            are kept without your name attached to them. The one exception is an intellectual
            property claim you sent about a teardown: it is a legal notice, so it keeps your name
            and email until six years after it is answered, as described under Information
            Collection.
          </dd>
        </div>
        <div>
          <dt>Complaints</dt>
          <dd>
            If you think we have handled your information badly, please tell us first at{" "}
            {PRIVACY_CONTACT_EMAIL} — we would rather fix it. You also have the right to complain to
            the data protection authority in the country where you live or work, or where you think
            the problem happened, and you can do that whether or not you have raised it with us.
          </dd>
        </div>
        <div>
          <dt>Security</dt>
          <dd>
            We take the security of your information seriously and have implemented technical,
            administrative, and physical security measures to protect it. However, no system is
            perfect, and we cannot guarantee that unauthorized access, hacking, data loss, or other
            breaches will never occur. You are responsible for keeping your password and other
            account information secure, and for promptly reporting any security incidents or
            unauthorized access to your account.
          </dd>
        </div>
        <div>
          <dt>Changes to this Policy</dt>
          <dd>
            We may update this policy from time to time to reflect changes to our practices or to
            comply with legal requirements. We will notify you of any changes by posting the revised
            policy on the site, and your continued use of the site after the changes become
            effective indicates your acceptance of the revised policy.
          </dd>
        </div>
        <div>
          <dt>Contact Us</dt>
          <dd>
            If you have questions or concerns about this policy, or if you would like to access,
            update, or delete your personal information, please contact us by email at{" "}
            {PRIVACY_CONTACT_EMAIL}. You can also start an access, export, or deletion request from
            Settings → Your data &amp; privacy in your account.
          </dd>
        </div>
      </dl>
    </main>
  );
}
