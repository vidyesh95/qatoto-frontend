// TRANSPORT: client-query — reads GET /commerce/threads.
"use client";

// THE INBOX A38 EXISTS FOR.
//
// `POST /commerce/threads` returned a thread id and nothing else ever yielded one, so every
// conversation the frontend could reach was one it had opened in the same session — reload the page
// and it was gone. A38 shipped this read; nothing consumed it until now.
//
// IT LINKS BY RESOURCE, NOT BY THREAD, and that is the shape rather than a limitation. A thread is
// keyed `(resourceKind, resourceId)` and always belongs to something — an RFQ, a quote, a product
// inquiry, a manufacturing inquiry — so the useful destination is that thing, where the conversation
// lives beside the terms it is about. A standalone `/threads/:id` page would be a chat window with
// no idea what it was about.
//
// `lastMessage` IS NULLABLE AND THAT IS A NORMAL STATE, not a defect: `createOrGetThread` mints the
// thread before the first message, so an inquiry opened and never written into is an empty thread.
// It renders as "no messages yet" rather than being hidden — hiding it would lose the only trace
// that somebody started a conversation.

import { useState } from "react";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useThreadInboxQuery } from "@/hooks/store/messages";
import { formatIsoInstantLabel } from "@/lib/store/format";
import {
  THREAD_RESOURCE_KINDS,
  type ThreadInboxEntry,
  type ThreadResourceKind,
} from "@/lib/store/messages.schemas";

const RESOURCE_KIND_LABELS: Readonly<Record<ThreadResourceKind, string>> = {
  rfq: "RFQ",
  quote: "Quote",
  product_inquiry: "Product",
  manufacturing_inquiry: "Manufacturing",
};

export default function ThreadInbox() {
  const [selectedKind, setSelectedKind] = useState<ThreadResourceKind | undefined>(undefined);
  const threadsQuery = useThreadInboxQuery(
    selectedKind === undefined ? {} : { resourceKind: selectedKind },
  );

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Messages</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every conversation your organization is part of.
        </p>
      </header>

      <fieldset className="mt-3 flex flex-wrap gap-2 px-4 lg:px-6">
        <legend className="sr-only">Filter conversations by what they are about</legend>
        <KindChip
          label="All"
          isSelected={selectedKind === undefined}
          onSelect={() => setSelectedKind(undefined)}
        />
        {THREAD_RESOURCE_KINDS.map((kind) => (
          <KindChip
            key={kind}
            label={RESOURCE_KIND_LABELS[kind]}
            isSelected={selectedKind === kind}
            onSelect={() => setSelectedKind(kind)}
          />
        ))}
      </fieldset>

      <div className="mt-3 px-4 lg:px-6">{renderInbox(threadsQuery)}</div>
    </div>
  );
}

function KindChip({
  label,
  isSelected,
  onSelect,
}: {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
        isSelected
          ? "border-transparent bg-[#00696E] text-white"
          : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function renderInbox(threadsQuery: ReturnType<typeof useThreadInboxQuery>) {
  if (threadsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading conversations…</p>;
  }

  const result = threadsQuery.data;
  if (threadsQuery.isError || result === undefined) {
    return (
      <StatusPanel
        message="Couldn't load your conversations."
        className="border border-border px-6 py-16"
      />
    );
  }
  if (!result.success) {
    return (
      <StatusPanel message={result.error.message} className="border border-border px-6 py-16" />
    );
  }
  if (result.data.items.length === 0) {
    return (
      <StatusPanel
        message="No conversations yet. Messaging a seller starts from one of their products."
        className="border border-border px-6 py-16"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {result.data.items.map((thread) => (
        <ThreadRow key={thread.id} thread={thread} />
      ))}
    </ul>
  );
}

function ThreadRow({ thread }: { thread: ThreadInboxEntry }) {
  const destination = resolveThreadDestination(thread);

  const body = (
    <>
      <p className="text-xs text-muted-foreground">
        {RESOURCE_KIND_LABELS[thread.resourceKind]} ·{" "}
        {formatIsoInstantLabel(thread.lastMessage?.createdAt ?? thread.updatedAt)}
      </p>
      <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-foreground">
        {/* Empty is a real state — see the header. */}
        {thread.lastMessage === null ? "No messages yet." : thread.lastMessage.bodyPreview}
      </p>
    </>
  );

  return (
    <li className="rounded-xl border border-border px-4 py-3">
      {destination === null ? (
        // A product-inquiry thread's `resourceId` is the INQUIRY id, not the product's, and there is
        // no route that resolves one to the other — so there is nowhere honest to send this row.
        // Saying so beats a link that 404s.
        <div>
          {body}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Open this conversation from the product it is about.
          </p>
        </div>
      ) : (
        <Link href={destination} className="block hover:underline">
          {body}
        </Link>
      )}
    </li>
  );
}

/** `null` when the thread's resource has no route that takes its id. */
function resolveThreadDestination(thread: ThreadInboxEntry): string | null {
  switch (thread.resourceKind) {
    case "rfq":
      return `/store/rfqs/${thread.resourceId}`;
    case "quote":
      return `/store/quotes/${thread.resourceId}`;
    case "manufacturing_inquiry":
      return `/store/factory-inquiries/${thread.resourceId}`;
    case "product_inquiry":
      return null;
    default: {
      const exhaustiveCheck: never = thread.resourceKind;
      return exhaustiveCheck;
    }
  }
}
