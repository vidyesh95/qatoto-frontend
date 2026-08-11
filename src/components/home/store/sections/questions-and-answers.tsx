// TRANSPORT: client-query — the first page is seeded from the server; opening a question fetches.
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
"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { useProductQuestionsQuery, useQuestionAnswersQuery } from "@/hooks/store/products";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  PRODUCT_ANSWER_AUTHOR_KIND_LABELS,
  type ProductAnswer,
  type ProductQuestion,
  type ProductQuestionListPage,
} from "@/lib/store/products.schemas";

export default function QuestionsAndAnswers({
  productSlug,
  initialPage,
  contactAffordance,
}: {
  readonly productSlug: string;
  readonly initialPage: ProductQuestionListPage | null;
  /** The server's own verdict on what this caller may do. Never inferred here. */
  readonly contactAffordance: "chat" | "ask_question" | "sign_in";
}) {
  const questionsQuery = useProductQuestionsQuery(productSlug, initialPage);
  const result = questionsQuery.data;

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
        {contactAffordance === "sign_in" ? (
          <p className="pb-3 text-xs leading-4 text-[#6F7979]">
            <Link href="/sign-in" className="font-medium text-[#00696E]">
              Sign in
            </Link>{" "}
            to ask this seller a question.
          </p>
        ) : (
          <p className="pb-3 text-xs leading-4 text-[#6F7979]">
            Questions are answered by the seller or by buyers who have purchased this product.
          </p>
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
                <QuestionRow productSlug={productSlug} question={question} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function QuestionRow({
  productSlug,
  question,
}: {
  readonly productSlug: string;
  readonly question: ProductQuestion;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only fetched once the buyer opens it — see the header note on why the rest of the answers are
  // their own route.
  const answersQuery = useQuestionAnswersQuery(productSlug, question.id, isExpanded);
  const answersResult = answersQuery.data;

  // One more answer exists than the preview shows.
  const hasMoreAnswers = question.answerCount > (question.topAnswer === null ? 0 : 1);

  return (
    <article className="border-b border-[#CAC4D0]/60 pb-3">
      <p className="text-sm leading-5 font-medium text-[#191C1C]">Q. {question.bodyText}</p>
      <p className="pt-0.5 text-[11px] leading-4 text-[#6F7979]">
        {question.askedBy?.name ?? "A buyer"} · {formatIsoInstantLabel(question.createdAt)}
      </p>

      {question.topAnswer === null ? (
        <p className="pt-1 text-xs leading-4 text-[#6F7979]">Not answered yet.</p>
      ) : (
        <AnswerBlock answer={question.topAnswer} />
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
                    <AnswerBlock answer={answer} />
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function AnswerBlock({ answer }: { readonly answer: ProductAnswer }) {
  return (
    <div className="pt-1.5">
      <p className="text-xs leading-4 whitespace-pre-line text-[#191C1C]">A. {answer.bodyText}</p>
      <p className="pt-0.5 text-[11px] leading-4 text-[#6F7979]">
        <span className="font-medium text-[#00696E]">
          {PRODUCT_ANSWER_AUTHOR_KIND_LABELS[answer.authorKind]}
        </span>
        {answer.author !== null && <span> · {answer.author.displayName}</span>}
        <span> · {formatCountLabel(answer.helpfulCount)} found this helpful</span>
      </p>
    </div>
  );
}
