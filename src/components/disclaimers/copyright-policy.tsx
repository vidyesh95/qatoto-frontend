import { SUPPORT_CONTACT_EMAIL } from "@/lib/site";

/**
 * ⚠️ THIS PAGE TOLD PEOPLE TO FILE A NOTICE AND DID NOT SAY HOW. It said "please notify us by
 * submitting a takedown notice" and "please contact us" and named no address, no form and no link
 * anywhere in it — while being the destination the blueprints surface pointed its "Report an IP
 * concern" controls at. A policy that states an obligation and withholds the mechanism is worse
 * than one that says nothing, because it reads as a process existing.
 *
 * ⚠️ NOTHING HERE MAY SAY "DMCA AGENT" OR IMPLY A STATUTORY PROCESS. Qatoto has designated no agent,
 * and `todo.md` already records the same gap against the video flag queue: it "is a COMMUNITY FLAG
 * QUEUE, not a DMCA process", missing claimant disclosure, a sworn statement, a counter-notice path,
 * a repeat-infringer policy and a designated agent. Naming an address is how to reach a person. It
 * is not a filing, and the copy says so.
 *
 * The "video sharing platform" framing below predates the store, R&D and blueprints. It is widened
 * here only as far as copyright goes; rewriting the rest of this page is its own change.
 */
export default function CopyrightPolicy() {
  return (
    <main>
      <h1 className="px-6 py-6 text-xl md:px-25">Copyright Policy</h1>
      <dl className="space-y-4 px-6 pb-25 text-justify text-sm md:px-25">
        <div>
          <dt>Introduction</dt>
          <dd>
            Qatoto carries videos, product listings, research and engineering teardowns, all of it
            published by its users. This policy sets out the rules and guidelines for copyright
            protection on Qatoto. Our aim is to ensure that the content on Qatoto is used in a way
            that is respectful to the rights of content owners.
          </dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>
            This policy applies to all users of Qatoto, including those who upload videos, publish
            teardowns and blueprints, list products, and comment on any of it. This policy applies
            to all forms of copyrightable works, including but not limited to audio, video, images,
            text, software, drawings and models.
          </dd>
        </div>
        <div>
          <dt>Copyright Infringement</dt>
          <dd>
            Qatoto takes copyright infringement very seriously and will take appropriate action
            against users who violate the rights of copyright owners. If you believe something on
            Qatoto infringes your rights, tell us. We will investigate and take appropriate action,
            which may include removing the material.
          </dd>
        </div>
        <div>
          <dt>How to give notice</dt>
          <dd>
            <p>
              Email{" "}
              <a
                href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
                className="font-medium text-[#00696E] hover:underline"
              >
                {SUPPORT_CONTACT_EMAIL}
              </a>
              . A notice we can act on says all of the following, and one that leaves any of it out
              usually means we have to write back before we can do anything:
            </p>
            <ul className="mt-2 list-inside list-disc">
              <li>what right you hold, and how we can identify it;</li>
              <li>
                exactly what on Qatoto you are objecting to, with the address of the page and, where
                it is one file or one part rather than the whole thing, which one;
              </li>
              <li>what you say copies your right, in enough detail for us to see it;</li>
              <li>
                your name, an address we can reply to, and whether you own the right or act for
                whoever does;
              </li>
              <li>
                that you believe in good faith the use is unauthorised, that what you have told us
                is accurate, and that you are entitled to make the claim.
              </li>
            </ul>
            <p className="mt-2">
              For a teardown, the <span className="font-medium">Report an IP concern</span> control
              on the teardown itself writes all of that for you and hands you the finished notice to
              send. For a video, use the report control on the video. Either way the notice reaches
              a person at the address above.
            </p>
            <p className="mt-2">
              Qatoto has not designated an agent for statutory copyright notices, so this is how to
              reach us rather than a formal filing. We do not charge for handling a notice and we do
              not require a particular form of words.
            </p>
          </dd>
        </div>
        <div>
          <dt>Teardowns and reverse engineering</dt>
          <dd>
            Qatoto carries engineering teardowns: a publisher&rsquo;s own measurements of a
            commercial unit they obtained lawfully. Every publisher states where their unit came
            from and swears that the survey is their own work and that no confidential material was
            used, and every teardown shows that statement to its readers. We do not host
            manufacturer-internal documents, and we make no assessment of whether a survey infringes
            anyone&rsquo;s rights &mdash; if you believe one does, the notice route above is how to
            tell us. You can read what a publisher declared on the teardown itself, under{" "}
            <span className="font-medium">What you may do with this</span>.
          </dd>
        </div>
        <div>
          <dt>User Content</dt>
          <dd>
            By uploading a video to Qatoto, you are representing and warranting that you own the
            rights to the video or have obtained permission from the copyright owner to upload the
            video to Qatoto. You also grant Qatoto a non-exclusive, royalty-free, worldwide license
            to use, copy, display, and distribute your video for the purpose of operating and
            promoting Qatoto.
          </dd>
        </div>
        <div>
          <dt>Disclaimer</dt>
          <dd>
            Qatoto does not endorse or assume any liability for the content uploaded by its users.
            We do not guarantee the accuracy or reliability of any content on Qatoto. Qatoto is not
            responsible for any damages resulting from the use of the content on Qatoto.
          </dd>
        </div>
        <div>
          <dt>Conclusion</dt>
          <dd>
            This policy is subject to change at any time and without notice. By using Qatoto, you
            are agreeing to be bound by this policy. If you have any questions about this policy,
            email{" "}
            <a
              href={`mailto:${SUPPORT_CONTACT_EMAIL}`}
              className="font-medium text-[#00696E] hover:underline"
            >
              {SUPPORT_CONTACT_EMAIL}
            </a>
            .
          </dd>
        </div>
      </dl>
    </main>
  );
}
