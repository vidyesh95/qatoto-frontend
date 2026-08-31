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
// COOKIES ARE ESSENTIAL-ONLY TODAY, WHICH IS THE ONLY REASON THERE IS NO CONSENT BANNER. The auth
// session cookie and one `localStorage` key are the whole inventory, and the only `<Script>` in
// `app/layout.tsx` is dev-gated. THE MOMENT ANY ANALYTICS, ADVERTISING OR EMBEDDED THIRD-PARTY
// SCRIPT SHIPS, prior consent becomes required and the cookie section below becomes false — the
// banner is part of that change, not a follow-up to it.

import {
  LEGAL_ENTITY_NAME,
  LEGAL_ENTITY_REGISTERED_ADDRESS,
  PRIVACY_CONTACT_EMAIL,
} from "@/lib/site";
import { PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL } from "@/lib/privacy-request";

export default function PrivacyPolicy() {
  return (
    <main>
      <h1 className="px-6 py-6 text-xl md:px-25">Privacy Policy</h1>
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
            it signed in from. The same inventory, in the same words, is in your account under
            Settings → Your data &amp; privacy.
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
        </div>
        <div>
          <dt>Use of Information</dt>
          <dd>
            The information we collect is used to provide and improve the services we offer, to
            communicate with you, and to personalize your experience on the site. We may use your
            information to send you updates, newsletters, and other marketing materials, and we may
            also use it to respond to your questions and requests. We may also use aggregated and
            anonymized information to perform research and analysis, to create reports, and to
            support other business purposes.
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
          <dt>Sharing of Information</dt>
          <dd>
            We may share your information with third-party service providers who help us provide the
            services we offer, such as hosting, payment processing, and customer support. We may
            also share your information with law enforcement or other government agencies when
            required by law, or when necessary to protect the safety, rights, or property of Qatoto,
            its users, or others. We will never sell or rent your personal information to third
            parties for marketing purposes without your consent.
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
            We use one cookie, and it is the one that keeps you signed in — without it every page
            would ask you to sign in again. We also keep a single entry in your browser's local
            storage, under the name <code>qatoto.browser-preferences</code>, holding your language,
            your browse country and whether AI assist is on. That entry never leaves your browser
            and is never sent to us. We run no analytics, advertising or tracking scripts, and we
            set no cookies for any of those purposes, so there is nothing here to ask your consent
            for and no consent banner to click through. If that ever changes, we will ask you first.
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
            are kept without your name attached to them.
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
