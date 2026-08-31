// TRANSPORT: server-fetch — `GET /pitches/:pitchSlug`, read with the caller's session
// forwarded so the founder additionally sees their own unconfirmed funding records.
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ExternalLinkOut,
  formatOutcomeAmount,
  OutcomeAttestationNote,
  PitchDisclaimer,
} from "@/components/pitches/pitch-shared";
import VideoPlayer from "@/components/home/watch/video-player";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import { getPitch } from "@/lib/rnd/pitches.api";
import { callerRequestOptions } from "@/lib/server-http";

/**
 * One pitch, as the world sees it.
 *
 * THE PAGE IS A LISTING, NOT AN OFFER. Everything a visitor could act on leaves Qatoto: the
 * funding link goes to whatever licensed platform the founder chose, and the contact link to
 * a page the founder owns. Qatoto holds no funds, takes no fee and reviewed this only for
 * spam, scams and illegal content — which is what `PitchDisclaimer` says, and why it renders
 * above the links rather than under them.
 *
 * ⚠️ NO AMOUNT OR EQUITY PERCENTAGE APPEARS HERE, and the backend stores none to render. A
 * public page carrying "raising $X for Y%" is a general solicitation in the US sense, and
 * that is the line this whole surface is drawn to stay behind.
 *
 * THE FUNDING RECORDS ARE ATTESTATIONS. What a visitor sees is the countersigned ones — two
 * people saying money moved somewhere Qatoto cannot see. The server decides that, from the
 * session; there is no client parameter for it, because one would let a founder publish a
 * raise nobody agreed to.
 */
export default async function PitchDetailPage({ pitchSlug }: { readonly pitchSlug: string }) {
  const requestOptions = await callerRequestOptions();
  const pitchResult = await getPitch(pitchSlug, requestOptions);

  // A 404 stays a 404. It covers "no such pitch" and "not published yet" alike, and turning
  // either into a message would tell a stranger which unpublished slugs exist.
  //
  // ⚠️ BUT ONLY A 404. This used to be `if (!pitchResult.success) notFound()`, which turned a
  // backend outage, a 500 and a parse failure into "this pitch does not exist" — the exact lie
  // series-detail-page.tsx documents its `unavailable` state to avoid, and a worse one here,
  // because a funding-adjacent listing reading as deleted is a claim about a founder's venture.
  // Every other detail page in the app tests the code first; this one was the outlier.
  //
  // No 422 arm, unlike market-insight-detail-page.tsx: `insightId` is a `z.uuid()` path segment
  // so a typo there is a shape refusal, while `pitchSlug` is a slug the lookup actually runs.
  if (!pitchResult.success) {
    if (pitchResult.error.code === "404") notFound();
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <RndErrorPanel message="Couldn't load this pitch." />
      </div>
    );
  }

  const { pitch, outcomes } = pitchResult.data;
  const isClosed = pitch.status === "closed";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/research-and-development" className="underline">
          R&amp;D
        </Link>{" "}
        ·{" "}
        <Link href={`/research-and-development/project/${pitch.projectSlug}`} className="underline">
          {pitch.projectName}
        </Link>
      </nav>

      <h1 className="mt-3 font-serif text-2xl font-semibold text-foreground md:text-3xl">
        {pitch.title}
      </h1>

      {/* A CLOSED PITCH KEEPS ITS PAGE, and says so. A 404 here would suggest it never
          existed, which is worse for anyone arriving from an old link. */}
      {isClosed && (
        <p className="mt-3 rounded-xl bg-secondary/50 p-3 text-sm text-foreground">
          This founder is no longer raising. The page is kept so older links still resolve.
        </p>
      )}

      {/* THE VIDEO LEADS, because that is what a funder watches before reading anything —
          the whole reason this page exists in the Kickstarter shape rather than as a text
          listing. `VideoPlayer` is the watch page's own player: youtube-nocookie, the IFrame
          API, and its own "embedding is turned off" fallback, so none of that is re-solved
          here.

          NULL COVERS TWO CASES AND RENDERS THE SAME FOR BOTH: no video was ever chosen, and
          the video is no longer publicly servable. A pitch whose video was taken down still
          renders everything else rather than 404ing, which is the join's whole point. */}
      {pitch.pitchVideo !== null && (
        <div className="mt-4">
          <VideoPlayer
            videoSource={pitch.pitchVideo.videoSource}
            youtubeVideoId={pitch.pitchVideo.youtubeVideoId}
            label={pitch.pitchVideo.title}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {pitch.pitchVideo.title} ·{" "}
            <Link
              href={`/watch?v=${encodeURIComponent(pitch.pitchVideo.videoId)}`}
              className="underline"
            >
              open on Qatoto
            </Link>
          </p>
        </div>
      )}

      <p className="mt-4 text-base leading-7 whitespace-pre-line text-foreground">
        {pitch.summary}
      </p>

      <div className="mt-6">
        <PitchDisclaimer />
      </div>

      {(pitch.externalFundingUrl !== null || pitch.externalContactUrl !== null) && !isClosed && (
        <section className="mt-6 flex flex-col gap-2 rounded-2xl border border-border p-5">
          <h2 className="text-sm font-medium text-foreground">Take this further</h2>
          {pitch.externalFundingUrl !== null && (
            <ExternalLinkOut href={pitch.externalFundingUrl} label="Fund this venture" />
          )}
          {pitch.externalContactUrl !== null && (
            <ExternalLinkOut href={pitch.externalContactUrl} label="Contact the founder" />
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Both links leave Qatoto. Whatever happens there is between you and the founder.
          </p>
        </section>
      )}

      {outcomes.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-foreground">Reported funding</h2>
          {/* SAID BEFORE THE NUMBERS, not after. These are things two people say happened
              somewhere else — never money Qatoto collected, held or verified. */}
          <p className="mt-1 text-xs text-muted-foreground">
            Self-reported by the people involved and confirmed by the other party. Qatoto did not
            handle or verify any of it.
          </p>
          <ul className="mt-3 space-y-2">
            {outcomes.map((outcome) => (
              <li key={outcome.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {formatOutcomeAmount(outcome.amountInCents, outcome.currencyCode)}
                  </span>
                  <span className="text-xs text-muted-foreground">{outcome.fundedOnDate}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  from {outcome.funderNameText}
                </p>
                {outcome.note !== null && (
                  <p className="mt-1 text-sm text-foreground">{outcome.note}</p>
                )}
                <p className="mt-1">
                  <OutcomeAttestationNote
                    isConfirmed={outcome.isConfirmed}
                    isConfirmable={outcome.isConfirmable}
                    recordedByName={outcome.recordedByName}
                  />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
        Part of{" "}
        <Link href={`/research-and-development/project/${pitch.projectSlug}`} className="underline">
          {pitch.projectName}
        </Link>
        {pitch.publishedAt !== null && ` · listed ${pitch.publishedAt.slice(0, 10)}`}
      </footer>
    </main>
  );
}
