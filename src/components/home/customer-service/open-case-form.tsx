// TRANSPORT: client-query — "use client" island writing POST /support/cases.
"use client";

// FOUR RULES THIS FORM HOLDS.
//
//  1. CATEGORY IS A SELECT, NEVER FREE TEXT. `order-dispute-control.tsx` records the reason on
//     the dispute surface and it applies unchanged: free text fragments one problem into six
//     spellings, and a queue that cannot be filtered by kind is a queue nobody triages.
//  2. THE IDEMPOTENCY KEY ROTATES ONLY AFTER A CONFIRMED SUCCESS. This form stays mounted, so
//     a person can open a second, different case without navigating — reusing the first key
//     there would dedupe the second case into silence. A retry of a timed-out submit must
//     carry the original key; that is the entire mechanism.
//  3. NOTHING IS OPTIMISTIC and a 201 is not an answer. The case exists and staff have been
//     told. No response time is promised anywhere, because nothing measures one.
//  4. NO COPY HERE MENTIONS A REFUND. Qatoto holds no funds; a case cannot move money.

import { useState } from "react";

import Link from "next/link";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useOpenSupportCaseMutation } from "@/hooks/support/cases";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { ApiRequestError } from "@/lib/http";
import {
  SUPPORT_CASE_CATEGORIES,
  SUPPORT_CASE_CATEGORY_LABELS,
  SUPPORT_CASE_DESCRIPTION_MAXIMUM_LENGTH,
  SUPPORT_CASE_ORDER_REFERENCE_MAXIMUM_LENGTH,
  SUPPORT_CASE_SUBJECT_MAXIMUM_LENGTH,
  type SupportCaseCategory,
} from "@/lib/support/schemas";

/** The two categories where naming the order saves a round trip. */
const CATEGORIES_WITH_AN_ORDER: readonly SupportCaseCategory[] = [
  "payment_problem",
  "order_problem",
];

/** Narrows a `<select>`'s value against the tuple it was rendered from. NOT an `as`. */
function narrowToCategory(value: string): SupportCaseCategory | undefined {
  return SUPPORT_CASE_CATEGORIES.find((category) => category === value);
}

export default function OpenCaseForm() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState<SupportCaseCategory>("payment_problem");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [orderReference, setOrderReference] = useState("");

  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const openCaseMutation = useOpenSupportCaseMutation();

  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();
  const trimmedOrderReference = orderReference.trim();
  // The server re-checks all of this; here it only keeps somebody from being told "no" after
  // they have finished typing.
  const isFormValid = trimmedSubject.length > 0 && trimmedDescription.length > 0;

  const openCaseError =
    openCaseMutation.error instanceof ApiRequestError ? openCaseMutation.error.apiError : null;

  const createdCase = openCaseMutation.data;

  function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!isFormValid || openCaseMutation.isPending) return;

    openCaseMutation.mutate(
      {
        input: {
          category,
          subject: trimmedSubject,
          description: trimmedDescription,
          ...(CATEGORIES_WITH_AN_ORDER.includes(category) && trimmedOrderReference !== ""
            ? { orderReference: trimmedOrderReference }
            : {}),
        },
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: () => {
          // Rotated only here — never on failure, where the retry must carry the original.
          resetIdempotencyKey();
          setSubject("");
          setDescription("");
          setOrderReference("");
        },
      },
    );
  }

  if (createdCase !== undefined) {
    return (
      <div className="rounded-xl border border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground">Case opened.</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          Support has been told and will reply on the case itself. You will get a notification when
          there is an answer.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link
            href={`/customer-service/cases/${createdCase.id}`}
            className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Open the case
          </Link>
          <button
            type="button"
            onClick={() => {
              openCaseMutation.reset();
              setIsFormOpen(false);
            }}
            className="cursor-pointer text-sm font-medium text-foreground underline"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!isFormOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white"
      >
        Open a support case
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border px-4 py-4">
      <label className="block">
        <span className={LABEL_CLASS}>What is it about</span>
        <select
          value={category}
          onChange={(changeEvent) =>
            setCategory(narrowToCategory(changeEvent.target.value) ?? "other")
          }
          className={`${INPUT_CLASS} mt-1`}
        >
          {SUPPORT_CASE_CATEGORIES.map((categoryValue) => (
            <option key={categoryValue} value={categoryValue}>
              {SUPPORT_CASE_CATEGORY_LABELS[categoryValue]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL_CLASS}>One line summary</span>
        <input
          type="text"
          value={subject}
          maxLength={SUPPORT_CASE_SUBJECT_MAXIMUM_LENGTH}
          onChange={(changeEvent) => setSubject(changeEvent.target.value)}
          className={`${INPUT_CLASS} mt-1`}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLASS}>What happened</span>
        <textarea
          value={description}
          rows={6}
          maxLength={SUPPORT_CASE_DESCRIPTION_MAXIMUM_LENGTH}
          onChange={(changeEvent) => setDescription(changeEvent.target.value)}
          className={`${INPUT_CLASS} mt-1`}
        />
      </label>

      {CATEGORIES_WITH_AN_ORDER.includes(category) && (
        <label className="block">
          <span className={LABEL_CLASS}>Order reference, if you have one (optional)</span>
          <input
            type="text"
            value={orderReference}
            maxLength={SUPPORT_CASE_ORDER_REFERENCE_MAXIMUM_LENGTH}
            onChange={(changeEvent) => setOrderReference(changeEvent.target.value)}
            className={`${INPUT_CLASS} mt-1`}
          />
        </label>
      )}

      <p className="text-[11px] leading-4 text-muted-foreground">
        A person reads and answers this. Qatoto holds no money, so a case cannot move a payment or
        issue a refund — it can find out what happened and point you at the record of it.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!isFormValid || openCaseMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {openCaseMutation.isPending ? "Sending…" : "Open the case"}
        </button>
        <button
          type="button"
          onClick={() => setIsFormOpen(false)}
          className="cursor-pointer text-sm font-medium text-foreground underline"
        >
          Cancel
        </button>
      </div>

      {openCaseError !== null && <MutationErrorNotice error={openCaseError} />}
    </form>
  );
}
