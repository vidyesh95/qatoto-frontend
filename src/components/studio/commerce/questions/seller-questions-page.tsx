// TRANSPORT: client-query — questions buyers asked on this organization's listings, and the seller's
// answers to them.
"use client";

// **THIS IS A WORK QUEUE, NOT A FEED, AND EVERY DECISION BELOW FOLLOWS FROM THAT.**
//
// It exists because the only route to a `questionId` was to walk your own catalogue product by
// product from the browser: a seller with two hundred listings could answer any question they were
// shown and had no way to find one.
//
// ⚠️ **OLDEST FIRST, so the forward button says "Show newer".** The backend orders
// `asc(createdAt), asc(id)` deliberately — newest-first is how the oldest unanswered question stays
// unanswered forever. `seller-reviews-page.tsx` says "Show older" and is right for ITS newest-first
// default; copying that label here points the wrong way.
//
// ⚠️ **"AWAITING YOUR ANSWER" IS NOT "UNANSWERED".** The backend filter is `hasSellerAnswer = false`,
// not `answerCount = 0`, so a question a verified BUYER already answered still matches. Labelling the
// chip "Unanswered" would be a false statement about a question that has an answer.
//
// ⚠️ **THE CURSOR IS CLEARED BY THE FILTER TOGGLE, and nothing structural enforces it.** A cursor is
// a position in one particular result set; carried across the toggle it resumes the OTHER result set
// partway through and silently hides every row sorting before it. That reads as "this filter has
// fewer matches than it does", which is worse than an empty page because it looks like an answer.
// `changeAwaitingAnswerOnly` is a wrapper for exactly this reason — a bare setter on the `onClick`
// is the bug.
//
// FILTER IN LOCAL STATE, NOT THE URL. A studio queue behind a session is not shareable or
// bookmarkable, so the half of the rule that matters is the other half: the filtering is the
// SERVER's, applied in SQL. Nothing here re-slices a fetched page, which is the thing actually
// forbidden — it silently short-pages every result.
//
// ⚠️ **AN EMPTY INBOX AND "YOU ARE NOT A SELLER" ARE THE SAME RESPONSE.** An organization owning no
// listings answers 200 with zero items, not 403 — the guard admits any seller/owner membership and
// the protection is the ownership scoping. So the empty state says "no questions", never "you are not
// a seller": a seller who has cleared the queue gets a byte-identical payload.

import { useState } from "react";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import SellerQuestionAnswer from "@/components/studio/commerce/questions/seller-question-answer";
import { useSellerQuestionInboxQuery } from "@/hooks/store/products";
import { formatIsoInstantLabel } from "@/lib/store/format";
import type { SellerQuestionInboxItem } from "@/lib/store/products.schemas";

const STUDIO_PANEL_CLASS = "border border-border px-6 py-16";

/** Matches the backend default. Small enough that a seller sees the queue shrink as they work it. */
const INBOX_PAGE_LIMIT = 20;

export default function SellerQuestionsPage() {
  const [isAwaitingAnswerOnly, setIsAwaitingAnswerOnly] = useState(false);
  /** Null is page one. Cleared by the filter toggle — see the header for why that is mandatory. */
  const [cursor, setCursor] = useState<string | null>(null);

  function changeAwaitingAnswerOnly(nextAwaitingAnswerOnly: boolean) {
    setIsAwaitingAnswerOnly(nextAwaitingAnswerOnly);
    setCursor(null);
  }

  const inboxQuery = useSellerQuestionInboxQuery({
    limit: INBOX_PAGE_LIMIT,
    // OMITTED rather than sent as `false`. The wire value is a string enum, and "all" is the absence
    // of the key rather than a value of it.
    ...(isAwaitingAnswerOnly ? { unansweredOnly: true } : {}),
    ...(cursor === null ? {} : { cursor }),
  });

  const result = inboxQuery.data;
  const page = result?.success ? result.data : null;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-medium text-foreground">Questions about your listings</h1>
        <p className="text-sm text-muted-foreground">
          Every question buyers asked on products you sell, oldest first — the one waiting longest
          is at the top.
        </p>
      </header>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filter questions</legend>
        <FilterChip
          label="All questions"
          isSelected={!isAwaitingAnswerOnly}
          onSelect={() => changeAwaitingAnswerOnly(false)}
        />
        {/* NOT "Unanswered" — see the header. A buyer may have answered it; you have not. */}
        <FilterChip
          label="Awaiting your answer"
          isSelected={isAwaitingAnswerOnly}
          onSelect={() => changeAwaitingAnswerOnly(true)}
        />
      </fieldset>

      {renderInbox()}
    </div>
  );

  function renderInbox() {
    if (inboxQuery.isPending) {
      return <p className="text-sm text-muted-foreground">Loading questions…</p>;
    }
    if (result === undefined || inboxQuery.isError) {
      return <StatusPanel message="Couldn't load your questions." className={STUDIO_PANEL_CLASS} />;
    }
    // THE SERVER'S OWN SENTENCE, VERBATIM. A 403 here has two causes this client cannot tell apart —
    // no seller membership, or a membership that is not the ACTIVE organization — and only the
    // backend knows which. No action button either: a 401 earns a sign-in link, a 403 does not,
    // because an action on a state the visitor cannot act on is a trap.
    if (!result.success) {
      return <StatusPanel message={result.error.message} className={STUDIO_PANEL_CLASS} />;
    }
    if (page === null || page.items.length === 0) {
      return (
        <StatusPanel
          message={
            isAwaitingAnswerOnly
              ? "You have answered every question."
              : "No buyer has asked a question about your listings yet."
          }
          className={STUDIO_PANEL_CLASS}
        />
      );
    }

    return (
      <>
        <ul className="space-y-4">
          {page.items.map((question) => (
            <li key={question.id}>
              <QuestionRow question={question} />
            </li>
          ))}
        </ul>

        {/*
          FORWARD-ONLY, which is the keyset's shape rather than a shortcut. A keyset cursor points at
          one row; there is no "previous" token without stacking them, and a page-number control needs
          a COUNT this route does not return. "Start over" is the honest way back, and it is exactly
          the reset the filter toggle performs.
        */}
        {(page.page.hasMore || cursor !== null) && (
          <div className="mt-4 flex items-center gap-3">
            {cursor !== null && (
              <button
                type="button"
                onClick={() => setCursor(null)}
                className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs"
              >
                Start over
              </button>
            )}
            {page.page.hasMore && page.page.nextCursor !== null && (
              <button
                type="button"
                onClick={() => setCursor(page.page.nextCursor)}
                className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs"
              >
                Show newer
              </button>
            )}
          </div>
        )}
      </>
    );
  }
}

function FilterChip({
  label,
  isSelected,
  onSelect,
}: {
  readonly label: string;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
        isSelected
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function QuestionRow({ question }: { readonly question: SellerQuestionInboxItem }) {
  return (
    <article className="rounded-lg border border-border p-4">
      {/* THE LINK IS GATED ON THE SLUG, NOT ON ANY STATUS. `publicSlug` is null while the listing is
          unpublished, and the slug is what decides whether a public URL exists at all. */}
      <p className="text-xs text-muted-foreground">
        {question.product.publicSlug === null ? (
          <span>{question.product.title} · not published</span>
        ) : (
          <Link
            href={`/store/product/${question.product.publicSlug}`}
            className="font-medium text-primary underline"
          >
            {question.product.title}
          </Link>
        )}
      </p>

      <p className="mt-1 text-sm leading-5 text-foreground">{question.bodyText}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
        {question.askedBy?.name ?? "A buyer"} · {formatIsoInstantLabel(question.createdAt)}
        {/* Null is not zero, and a buyer's answer is still an answer — it just is not yours. */}
        {question.answerCount > 0 && ` · ${question.answerCount} answered`}
      </p>

      {question.topAnswer !== null && (
        <div className="mt-2 rounded-lg bg-muted px-3 py-2">
          <p className="text-[11px] font-medium text-foreground">
            {question.hasSellerAnswer ? "Your organization answered" : "A verified buyer answered"}
          </p>
          <p className="text-xs leading-4 whitespace-pre-line text-foreground">
            {question.topAnswer.bodyText}
          </p>
        </div>
      )}

      <SellerQuestionAnswer
        questionId={question.id}
        productSlug={question.product.publicSlug}
        hasSellerAnswer={question.hasSellerAnswer}
      />
    </article>
  );
}
