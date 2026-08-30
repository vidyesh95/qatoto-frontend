// TRANSPORT: client-query — the first page is seeded from the server; opening a question fetches,
// and the composers, the helpful toggle and the two retractions write.
//
// Q&A IS THE PUBLIC TEXT SURFACE THIS LISTING HAS, and it is deliberately the only one. Product
// comments were decided against rather than deferred (backend A10) precisely because every other
// channel here requires standing: an answer needs a seller relationship or a verified purchase, a
// review needs a completed order, a private inquiry needs a buyer organization. A free-floating
// comment would have been the one public surface with no standing requirement behind it.
//
// EACH QUESTION EMBEDS AT MOST ONE ANSWER — the seller's first. The rest are a separate paginated
// route, because a cursor over a computed preference rank is how pagination starts skipping rows.
// So opening a question is a real fetch, not a client-side expand.
//
// `authorKind` IS DERIVED BY THE SERVER, never sent. "Seller" and "Verified buyer" are claims about
// standing, and a client that could assert either would make the badge meaningless.
//
// ⚠️ THE DELETE CONTROLS APPEAR ONLY ON ROWS THIS SESSION POSTED, and that is a backend gap rather
// than a design choice. Retraction is author-only and matched on the USER, but the question
// projection carries no `viewer` object at all and an answer's `author` is the ORGANIZATION — so
// nothing in either payload says whether the reader wrote the row. The ids returned by the two 201s
// are the only authorship this client can prove, so they are the only rows that get a control. A
// control rendered on every row would 404 for almost everyone, which is the thing this codebase
// refuses to ship. The fix is `viewer.canDelete` on both projections.
"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import {
  useAnswerProductQuestion,
  useAskProductQuestion,
  useProductQuestionsQuery,
  useQuestionAnswersQuery,
  useRetractProductAnswer,
  useRetractProductQuestion,
  useSetProductAnswerHelpfulVote,
} from "@/hooks/store/products";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  PRODUCT_ANSWER_AUTHOR_KIND_LABELS,
  PRODUCT_ANSWER_BODY_MAX_LENGTH,
  PRODUCT_QUESTION_BODY_MAX_LENGTH,
  type ProductAnswer,
  type ProductContactAffordance,
  type ProductQuestion,
  type ProductQuestionListPage,
} from "@/lib/store/products.schemas";

/**
 * The rows this session created, which is the only authorship the client can prove.
 *
 * Two sets rather than one, because the ids come from different routes and are deleted by different
 * ones — collapsing them would let an answer id be sent to the question retraction.
 */
interface AuthoredThisSession {
  readonly questionIds: ReadonlySet<string>;
  readonly answerIds: ReadonlySet<string>;
}

export default function QuestionsAndAnswers({
  productSlug,
  productId,
  initialPage,
  contactAffordance,
}: {
  readonly productSlug: string;
  /**
   * ⚠️ THE CREATE ROUTE IS KEYED ON THE ID, not the slug every read on this page uses. It is
   * threaded down separately for that one call; posting the slug is a 404 indistinguishable from a
   * missing product.
   */
  readonly productId: string;
  readonly initialPage: ProductQuestionListPage | null;
  /** The server's own verdict on what this caller may do. Never inferred here. */
  readonly contactAffordance: ProductContactAffordance;
}) {
  const questionsQuery = useProductQuestionsQuery(productSlug, initialPage);
  const result = questionsQuery.data;

  const [authoredThisSession, setAuthoredThisSession] = useState<AuthoredThisSession>({
    questionIds: new Set(),
    answerIds: new Set(),
  });

  function rememberAuthoredQuestion(questionId: string) {
    setAuthoredThisSession((previous) => ({
      ...previous,
      questionIds: new Set(previous.questionIds).add(questionId),
    }));
  }

  function rememberAuthoredAnswer(answerId: string) {
    setAuthoredThisSession((previous) => ({
      ...previous,
      answerIds: new Set(previous.answerIds).add(answerId),
    }));
  }

  const isViewerSignedIn = contactAffordance !== "sign_in";

  return (
    <details open className="group/section border-t border-[#CAC4D0]/60 px-4 py-2 lg:px-6">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2 [&::-webkit-details-marker]:hidden">
        <h2 className="flex-1 text-sm tracking-[0.25px] text-[#191C1C]">Questions and answers</h2>
        <Image
          src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          width={24}
          height={24}
          alt=""
          className="transition-transform group-open/section:rotate-180"
        />
      </summary>

      <div className="py-2">
        {/* WHICH CONTROL APPEARS IS THE SERVER'S DECISION. A signed-out visitor gets a sign-in
            link rather than a form that would 401, and the middle rung — signed in, no buyer
            organization — is exactly who Q&A was built to admit. */}
        {isViewerSignedIn ? (
          <p className="pb-3 text-xs leading-4 text-[#6F7979]">
            Questions are answered by the seller or by buyers who have purchased this product.
          </p>
        ) : (
          <p className="pb-3 text-xs leading-4 text-[#6F7979]">
            <Link href="/sign-in" className="font-medium text-[#00696E]">
              Sign in
            </Link>{" "}
            to ask this seller a question.
          </p>
        )}

        {isViewerSignedIn && (
          <AskQuestionComposer
            productSlug={productSlug}
            productId={productId}
            onQuestionPosted={rememberAuthoredQuestion}
          />
        )}

        {result === undefined ? (
          <p className="text-xs text-[#6F7979]">Loading questions…</p>
        ) : !result.success ? (
          <StoreErrorPanel message={result.error.message} />
        ) : result.data.items.length === 0 ? (
          <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
            No questions about this product yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {result.data.items.map((question) => (
              <li key={question.id}>
                <QuestionRow
                  productSlug={productSlug}
                  question={question}
                  isViewerSignedIn={isViewerSignedIn}
                  authoredThisSession={authoredThisSession}
                  onAnswerPosted={rememberAuthoredAnswer}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

/**
 * Asks a question.
 *
 * THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT and rotated only after a confirmed success, so a
 * retry after a network failure reuses it and cannot post the question twice. The resettable variant
 * is the right one here because this box is not one-shot: a buyer asks a second question minutes
 * later without the component ever unmounting, and reusing the first key would dedupe that second
 * question into silence — the asker watches their question vanish and asks again.
 */
function AskQuestionComposer({
  productSlug,
  productId,
  onQuestionPosted,
}: {
  readonly productSlug: string;
  readonly productId: string;
  readonly onQuestionPosted: (questionId: string) => void;
}) {
  const [bodyText, setBodyText] = useState("");
  const askQuestion = useAskProductQuestion(productSlug, productId);
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const trimmedBody = bodyText.trim();
  const isSubmittable =
    trimmedBody.length > 0 &&
    trimmedBody.length <= PRODUCT_QUESTION_BODY_MAX_LENGTH &&
    !askQuestion.isPending;

  return (
    <form
      className="pb-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmittable) return;
        askQuestion.mutate(
          { bodyText: trimmedBody, idempotencyKey: getIdempotencyKey() },
          {
            onSuccess: (mutationResult) => {
              // ROTATED ONLY ON A CONFIRMED SUCCESS. A failure keeps the key, because a retry after
              // a network error must carry the key of the attempt it is retrying.
              if (!mutationResult.success) return;
              setBodyText("");
              resetIdempotencyKey();
              onQuestionPosted(mutationResult.data.id);
            },
          },
        );
      }}
    >
      <label
        htmlFor="product-question-body"
        className="text-xs leading-4 font-medium text-[#191C1C]"
      >
        Ask a question
      </label>
      <textarea
        id="product-question-body"
        value={bodyText}
        onChange={(event) => setBodyText(event.target.value)}
        rows={3}
        maxLength={PRODUCT_QUESTION_BODY_MAX_LENGTH}
        placeholder="What would you like to know about this product?"
        className="mt-1 w-full rounded-lg border border-[#CAC4D0] px-3 py-2 text-sm leading-5 text-[#191C1C]"
      />
      <div className="mt-1 flex items-center gap-3">
        <button
          type="submit"
          disabled={!isSubmittable}
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {askQuestion.isPending ? "Posting…" : "Post question"}
        </button>
        <span className="text-[11px] leading-4 text-[#6F7979]">
          Your question is public. {trimmedBody.length}/{PRODUCT_QUESTION_BODY_MAX_LENGTH}
        </span>
      </div>
      <MutationNotice
        result={askQuestion.data}
        fallbackMessage="That question did not post. Try again."
        hasThrown={askQuestion.isError}
      />
    </form>
  );
}

function QuestionRow({
  productSlug,
  question,
  isViewerSignedIn,
  authoredThisSession,
  onAnswerPosted,
}: {
  readonly productSlug: string;
  readonly question: ProductQuestion;
  readonly isViewerSignedIn: boolean;
  readonly authoredThisSession: AuthoredThisSession;
  readonly onAnswerPosted: (answerId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);

  // Only fetched once the buyer opens it — see the header note on why the rest of the answers are
  // their own route.
  const answersQuery = useQuestionAnswersQuery(productSlug, question.id, isExpanded);
  const answersResult = answersQuery.data;
  const retractQuestion = useRetractProductQuestion(productSlug);

  // One more answer exists than the preview shows.
  const hasMoreAnswers = question.answerCount > (question.topAnswer === null ? 0 : 1);
  const canRetractQuestion = authoredThisSession.questionIds.has(question.id);

  return (
    <article className="border-b border-[#CAC4D0]/60 pb-3">
      <p className="text-sm leading-5 font-medium text-[#191C1C]">Q. {question.bodyText}</p>
      <p className="pt-0.5 text-[11px] leading-4 text-[#6F7979]">
        {question.askedBy?.name ?? "A buyer"} · {formatIsoInstantLabel(question.createdAt)}
        {canRetractQuestion && (
          <>
            {" · "}
            <button
              type="button"
              disabled={retractQuestion.isPending}
              onClick={() => retractQuestion.mutate({ questionId: question.id })}
              className="cursor-pointer font-medium text-[#8C1D18] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {retractQuestion.isPending ? "Withdrawing…" : "Withdraw"}
            </button>
          </>
        )}
      </p>
      <MutationNotice
        result={retractQuestion.data}
        fallbackMessage="That question could not be withdrawn."
        hasThrown={retractQuestion.isError}
      />

      {question.topAnswer === null ? (
        <p className="pt-1 text-xs leading-4 text-[#6F7979]">Not answered yet.</p>
      ) : (
        <AnswerBlock
          productSlug={productSlug}
          questionId={question.id}
          answer={question.topAnswer}
          authoredThisSession={authoredThisSession}
        />
      )}

      {hasMoreAnswers && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="pt-1 text-xs font-medium text-[#2A76FD]"
        >
          Read {question.answerCount - 1} more{" "}
          {question.answerCount - 1 === 1 ? "answer" : "answers"}
        </button>
      )}

      {isExpanded && (
        <div className="pt-1">
          {answersResult === undefined ? (
            <p className="text-xs text-[#6F7979]">Loading answers…</p>
          ) : !answersResult.success ? (
            <p className="text-xs text-[#8C1D18]">{answersResult.error.message}</p>
          ) : (
            <ul>
              {answersResult.data.items
                .filter((answer) => answer.id !== question.topAnswer?.id)
                .map((answer) => (
                  <li key={answer.id}>
                    <AnswerBlock
                      productSlug={productSlug}
                      questionId={question.id}
                      answer={answer}
                      authoredThisSession={authoredThisSession}
                    />
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {isViewerSignedIn &&
        (isAnswering ? (
          <AnswerComposer
            productSlug={productSlug}
            questionId={question.id}
            onCancel={() => setIsAnswering(false)}
            onAnswerPosted={(answerId) => {
              onAnswerPosted(answerId);
              setIsAnswering(false);
              setIsExpanded(true);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAnswering(true)}
            className="pt-1 text-xs font-medium text-[#00696E]"
          >
            Answer this question
          </button>
        ))}
    </article>
  );
}

/**
 * Answers a question.
 *
 * ⚠️ MOST SIGNED-IN VIEWERS MAY NOT ANSWER, AND THE NOTE SAYS SO BEFORE THEY TYPE. The backend
 * admits exactly two standings — the selling organization, or an organization holding a completion
 * against this product — and refuses everyone else with 403. Disclosing that up front is the
 * difference between a form and a trap; the refusal itself still renders, because a buyer who
 * believes they qualify deserves the server's reason rather than a hidden control.
 */
function AnswerComposer({
  productSlug,
  questionId,
  onCancel,
  onAnswerPosted,
}: {
  readonly productSlug: string;
  readonly questionId: string;
  readonly onCancel: () => void;
  readonly onAnswerPosted: (answerId: string) => void;
}) {
  const [bodyText, setBodyText] = useState("");
  const answerQuestion = useAnswerProductQuestion(productSlug);
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const trimmedBody = bodyText.trim();
  const isSubmittable =
    trimmedBody.length > 0 &&
    trimmedBody.length <= PRODUCT_ANSWER_BODY_MAX_LENGTH &&
    !answerQuestion.isPending;

  return (
    <form
      className="pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmittable) return;
        answerQuestion.mutate(
          { questionId, bodyText: trimmedBody, idempotencyKey: getIdempotencyKey() },
          {
            onSuccess: (mutationResult) => {
              if (!mutationResult.success) return;
              setBodyText("");
              resetIdempotencyKey();
              onAnswerPosted(mutationResult.data.id);
            },
          },
        );
      }}
    >
      <label
        htmlFor={`product-answer-body-${questionId}`}
        className="text-xs leading-4 font-medium text-[#191C1C]"
      >
        Your answer
      </label>
      <p className="text-[11px] leading-4 text-[#6F7979]">
        Only the seller or a buyer who has completed an order for this product can answer.
      </p>
      <textarea
        id={`product-answer-body-${questionId}`}
        value={bodyText}
        onChange={(event) => setBodyText(event.target.value)}
        rows={3}
        maxLength={PRODUCT_ANSWER_BODY_MAX_LENGTH}
        className="mt-1 w-full rounded-lg border border-[#CAC4D0] px-3 py-2 text-sm leading-5 text-[#191C1C]"
      />
      <div className="mt-1 flex items-center gap-3">
        <button
          type="submit"
          disabled={!isSubmittable}
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {answerQuestion.isPending ? "Posting…" : "Post answer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-xs font-medium text-[#6F7979]"
        >
          Cancel
        </button>
      </div>
      <MutationNotice
        result={answerQuestion.data}
        fallbackMessage="That answer did not post. Try again."
        hasThrown={answerQuestion.isError}
      />
    </form>
  );
}

function AnswerBlock({
  productSlug,
  questionId,
  answer,
  authoredThisSession,
}: {
  readonly productSlug: string;
  readonly questionId: string;
  readonly answer: ProductAnswer;
  readonly authoredThisSession: AuthoredThisSession;
}) {
  const setHelpfulVote = useSetProductAnswerHelpfulVote(productSlug);
  const retractAnswer = useRetractProductAnswer(productSlug);

  // `viewer` IS THE PERMISSION, not just the current state. Null means the caller has no active
  // commerce organization — the vote table is keyed on the organization — so the count renders with
  // nothing to press rather than a button that would 403.
  const canVote = answer.viewer !== null;
  const hasVotedHelpful = answer.viewer?.hasVotedHelpful ?? false;
  const canRetractAnswer = authoredThisSession.answerIds.has(answer.id);

  return (
    <div className="pt-1.5">
      <p className="text-xs leading-4 whitespace-pre-line text-[#191C1C]">A. {answer.bodyText}</p>
      <p className="pt-0.5 text-[11px] leading-4 text-[#6F7979]">
        <span className="font-medium text-[#00696E]">
          {PRODUCT_ANSWER_AUTHOR_KIND_LABELS[answer.authorKind]}
        </span>
        {answer.author !== null && <span> · {answer.author.displayName}</span>}
        <span> · {formatCountLabel(answer.helpfulCount)} found this helpful</span>
        {canVote && (
          <>
            {" · "}
            <button
              type="button"
              aria-pressed={hasVotedHelpful}
              disabled={setHelpfulVote.isPending}
              // The direction comes from what the SERVER last said, never from an optimistic local
              // flip — the count beside it has to stay true.
              onClick={() =>
                setHelpfulVote.mutate({
                  answerId: answer.id,
                  questionId,
                  isHelpful: !hasVotedHelpful,
                })
              }
              className="cursor-pointer font-medium text-[#00696E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasVotedHelpful ? "Helpful" : "Mark helpful"}
            </button>
          </>
        )}
        {canRetractAnswer && (
          <>
            {" · "}
            <button
              type="button"
              disabled={retractAnswer.isPending}
              onClick={() => retractAnswer.mutate({ answerId: answer.id, questionId })}
              className="cursor-pointer font-medium text-[#8C1D18] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {retractAnswer.isPending ? "Withdrawing…" : "Withdraw"}
            </button>
          </>
        )}
      </p>
      <MutationNotice
        result={setHelpfulVote.data}
        fallbackMessage="That vote did not register."
        hasThrown={setHelpfulVote.isError}
      />
      <MutationNotice
        result={retractAnswer.data}
        fallbackMessage="That answer could not be withdrawn."
        hasThrown={retractAnswer.isError}
      />
    </div>
  );
}
