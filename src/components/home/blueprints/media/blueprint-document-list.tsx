// TRANSPORT: props-only — the documents arrive from the teardown detail page, which reads
// `@/lib/blueprints/api`. This component fetches nothing.
"use client";

import Image from "next/image";
import { useState } from "react";

import BlueprintDocumentViewer from "@/components/home/blueprints/media/blueprint-document-viewer";
import { formatFileSizeFromBytes } from "@/lib/blueprints/format";
import { BLUEPRINT_DOCUMENT_KIND_LABELS, type BlueprintDocument } from "@/lib/blueprints/schemas";

/**
 * Everything a teardown published, as a list.
 *
 * A CLIENT ISLAND RATHER THAN A SERVER LIST WITH CLIENT ROWS. Every row carries a View trigger, so
 * a server list would be a shell around N islands that each hold one boolean and each render their
 * own sheet — more client JavaScript, not less, and a second open sheet the moment two rows are
 * clicked. One island holds one `openDocumentId` and at most one sheet exists.
 *
 * RENDERS NOTHING FOR AN EMPTY LIST. `documents: []` means this teardown published no files, and
 * an empty "Documents" heading is a promise of a section that is not there. Most teardowns in the
 * fixtures publish nothing, so this is the common path rather than an edge case.
 */
export default function BlueprintDocumentList({
  documents,
}: {
  readonly documents: readonly BlueprintDocument[];
}) {
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);

  if (documents.length === 0) return null;

  const openDocument = documents.find((entry) => entry.id === openDocumentId) ?? null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">Documents</h2>

      <ul className="mt-2 max-w-2xl space-y-2">
        {documents.map((blueprintDocument) => (
          <li
            key={blueprintDocument.id}
            className="flex items-center gap-3 rounded-xl border border-[#CAC4D0]/60 px-3 py-2.5"
          >
            <Image
              src="/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
              className="size-6 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{blueprintDocument.title}</p>
              <p className="mt-0.5 text-[11px] text-[#6F7979]">
                {BLUEPRINT_DOCUMENT_KIND_LABELS[blueprintDocument.kind]}
                {" · "}
                {formatFileSizeFromBytes(blueprintDocument.byteSize)}
                {/* `null` when nobody counted the pages — say nothing rather than "0 pages". */}
                {blueprintDocument.pageCount === null
                  ? null
                  : ` · ${blueprintDocument.pageCount} ${
                      blueprintDocument.pageCount === 1 ? "page" : "pages"
                    }`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpenDocumentId(blueprintDocument.id)}
              className="shrink-0 cursor-pointer rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              View
            </button>

            <a
              href={blueprintDocument.url}
              download
              aria-label={`Download ${blueprintDocument.title}`}
              className="shrink-0 rounded-full p-1 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/download_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
                className="size-5"
              />
            </a>
          </li>
        ))}
      </ul>

      {openDocument === null ? null : (
        <BlueprintDocumentViewer document={openDocument} onClose={() => setOpenDocumentId(null)} />
      )}
    </section>
  );
}
