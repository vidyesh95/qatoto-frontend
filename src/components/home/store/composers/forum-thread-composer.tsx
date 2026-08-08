// TRANSPORT: client-query — writes POST /commerce/forum/threads.
"use client";

// ASKING A QUESTION ON THE BUSINESS FORUM. One screen, three fields, then a moderation queue.
//
// IT DOES NOT PUBLISH. The row comes back `state: "pending_review"` and appears in no public read
// until a moderator approves it. `forum.schemas.ts` carries the argument in full; the part that
// matters here is that the success copy must say "queued for review" and must never say "posted",
// "live" or "published" — a member who believes their question is up stops checking back for it.
//
// NO STEP RAIL, unlike the RFQ and factory composers. Three required fields do not need to be paced,
// and a wizard around them would make asking a question feel like filing a request.
//
// IDEMPOTENCY KEY MINTED ONCE, held in a ref. A fresh key per retry posts the same question twice and
// a moderator rejects one by hand.

import { useState } from "react";

import Link from "next/link";

import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/commerce/composer/composer-fields";
import { toOptionalText } from "@/components/commerce/composer/composer-input";
import { useCreateForumThread } from "@/hooks/store/forum";
import { useAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  FORUM_BOARD_DESCRIPTIONS,
  FORUM_BOARD_LABELS,
  FORUM_BOARDS,
  type CreateForumThreadInput,
  type ForumBoard,
} from "@/lib/store/forum.schemas";

interface ForumThreadDraft {
  board: ForumBoard;
  title: string;
  body: string;
}

const EMPTY_DRAFT: ForumThreadDraft = {
  // Pre-selected rather than blank: `board` is required, and a blank required select is a 422
  // waiting for a distracted member. Sourcing is the widest board, so it is the least wrong default.
  board: "sourcing",
  title: "",
  body: "",
};

const BOARD_OPTIONS = FORUM_BOARDS.map((board) => ({
  value: board,
  label: FORUM_BOARD_LABELS[board],
}));

export default function ForumThreadComposer() {
  const [draft, setDraft] = useState<ForumThreadDraft>(EMPTY_DRAFT);
  const getIdempotencyKey = useAttemptIdempotencyKey();
  const createForumThread = useCreateForumThread();

  const applyDraftPatch = (draftPatch: Partial<ForumThreadDraft>) => {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  };

  const createResult = createForumThread.data;

  if (createResult !== undefined && createResult.success) {
    return <QueuedForReviewPanel board={createResult.data.board} />;
  }

  const input = buildCreateForumThreadInput(draft);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          Ask the business forum
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every thread is read by a moderator before it appears. That usually takes a day.
        </p>
      </header>

      <div className="space-y-3">
        <SelectField
          label="Board"
          hint={FORUM_BOARD_DESCRIPTIONS[draft.board]}
          value={draft.board}
          options={BOARD_OPTIONS}
          onValueChange={(board) => applyDraftPatch({ board })}
        />
        <TextField
          label="Question"
          hint="One sentence. The specific version gets better answers than the general one."
          value={draft.title}
          onValueChange={(title) => applyDraftPatch({ title })}
          placeholder="Who owns the mould when you paid for it?"
          maxLength={200}
        />
        <TextAreaField
          label="What is going on"
          hint="Numbers, dates and what the other side has said. Plain text — formatting is not rendered."
          value={draft.body}
          onValueChange={(body) => applyDraftPatch({ body })}
          rows={10}
          maxLength={10_000}
        />
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={input === null || createForumThread.isPending}
          onClick={() => {
            if (input === null) return;
            createForumThread.mutate({ input, idempotencyKey: getIdempotencyKey() });
          }}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {createForumThread.isPending ? "Sending…" : "Send for review"}
        </button>
        {input === null && (
          <p className="text-xs leading-4 text-muted-foreground">
            A question and some detail are both needed.
          </p>
        )}
      </footer>

      {createResult !== undefined &&
        !createResult.success && (
          // The server's own message. A 422 names the field; "something went wrong" throws that away.
          <p className="text-xs leading-4 text-destructive">{createResult.error.message}</p>
        )}
      {createForumThread.isError && (
        <p className="text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Pressing send again is safe — the request carries an
          idempotency key, so a retry cannot post the same question twice.
        </p>
      )}
    </div>
  );
}

/**
 * The draft as a request body, or `null` when a required field is blank.
 *
 * All three fields are required, so there is nothing here to omit — which is why this composer needs
 * only `toOptionalText`, and uses it as a blank check rather than as a conversion.
 */
function buildCreateForumThreadInput(draft: ForumThreadDraft): CreateForumThreadInput | null {
  const title = toOptionalText(draft.title);
  const body = toOptionalText(draft.body);
  if (title === undefined || body === undefined) return null;
  return { board: draft.board, title, body };
}

function QueuedForReviewPanel({ board }: { board: ForumBoard }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-2xl text-primary">
        ✓
      </span>
      <p className="text-base font-medium text-foreground">Sent for review</p>
      {/* SAYS WHAT HAPPENED. The thread is not on the forum and nobody can read it — including the
          person who just wrote it, which is the part a "posted!" screen would hide. */}
      <p className="text-sm text-muted-foreground">
        A moderator reads every thread before it appears. Yours is not on{" "}
        {FORUM_BOARD_LABELS[board]} yet and is not visible to anyone. You will not lose it — there
        is nothing to do but wait.
      </p>
      <Link
        href="/store/forum"
        className="mt-2 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to the forum
      </Link>
    </div>
  );
}
