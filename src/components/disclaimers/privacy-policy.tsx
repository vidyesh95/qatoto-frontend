import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";

export default function PrivacyPolicy() {
  return (
    <main>
      <h1 className="px-6 py-6 text-xl md:px-25">Privacy Policy</h1>
      <dl className="space-y-4 px-6 pb-25 text-justify text-sm md:px-25">
        <div>
          <dt>Introduction</dt>
          <dd>
            Qatoto is a video sharing platform that is committed to protecting the privacy of its
            users. We understand the importance of privacy and have created this policy to explain
            what information we collect, how we use it, and what measures we take to protect it.
          </dd>
        </div>
        <div>
          <dt>Information Collection</dt>
          <dd>
            We collect information that you provide to us directly, such as when you create an
            account, upload videos, or interact with other users. This information may include your
            name, email address, profile picture, and other personal information. We also collect
            information about your use of the site, such as the videos you upload and view, the
            comments you make, and the interactions you have with other users.
          </dd>
        </div>
        <div>
          {/* ADDED WITH THE WATCH-TIME SURFACE. Three rollup tables record how long and at what hour
              each signed-in account watches, and this document is the one with legal weight — the
              in-app inventory at Settings &rarr; Your data &amp; privacy mirrors it, not the other
              way round. The windows below are the retention periods the platform actually prunes
              on. This does NOT close the wider Art. 13 gaps in this policy (controller identity,
              lawful basis, enumerated rights); those remain outstanding. */}
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
