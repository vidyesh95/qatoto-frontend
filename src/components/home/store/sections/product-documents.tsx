// TRANSPORT: props-only — the documents arrive on the product read; nothing is fetched here.

import Image from "next/image";

import { API_BASE_URL } from "@/lib/api";
import { PRODUCT_DOCUMENT_KIND_LABELS, type ProductDocument } from "@/lib/store/products.schemas";

/** Bytes to something a buyer reads. Same shape the watch page uses for video documents. */
function formatDocumentSizeLabel(byteSize: number): string {
  if (byteSize < 1024) return `${String(byteSize)} B`;
  if (byteSize < 1024 * 1024) return `${(byteSize / 1024).toFixed(0)} KB`;
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * STORE §21.3. The files a seller published with this listing — datasheet, manual, care guide.
 *
 * ⚠️ `API_BASE_URL` + `downloadPath`, NOT A STORAGE LINK, and this is the whole design rather than
 * a detail. `commerce_product_document` has no `url` column: the href points at this API, which
 * re-checks the listing's public gate on every fetch and only then 302s to a URL that lives five
 * minutes. A seller who unpublishes this listing breaks these links, which is exactly the point —
 * a stored URL would keep working because bytes do not know a row's visibility changed.
 *
 * `rel="noopener"` on a `target="_blank"`, and `download` is deliberately NOT set: the server
 * already sends `Content-Disposition: attachment`, and a `download` attribute on a cross-origin
 * href is ignored by browsers anyway, so writing it would only imply it were doing something.
 *
 * ⚠️ NOTHING HERE SAYS THESE FILES WERE SCANNED, and nothing added later may. There is no virus
 * scan on this path — a decision recorded in migration `0155`, not an oversight. Copy implying a
 * check nobody performs is worse than no copy at all.
 *
 * HIDDEN ENTIRELY WHEN EMPTY, which is this page's uniform convention — `ProductHighlights` and
 * `ProductDetailsSection` both return null rather than rendering a "nothing here yet" state.
 */
export default function ProductDocuments({
  documents,
}: {
  readonly documents: readonly ProductDocument[];
}) {
  if (documents.length === 0) return null;

  const orderedDocuments = documents.toSorted((first, second) => first.position - second.position);

  return (
    <section className="mt-6 flex flex-col gap-2">
      <h2 className="text-sm font-medium text-[#191C1C]">Documents</h2>
      <ul className="flex flex-wrap gap-2">
        {orderedDocuments.map((document) => (
          <li key={document.id}>
            <a
              href={`${API_BASE_URL}${document.downloadPath}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium text-[#191C1C] transition-colors hover:bg-[#F2F4F4]"
            >
              <Image
                src="/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={16}
                height={16}
              />
              {document.fileName}
              <span className="text-[#6F7979]">
                {PRODUCT_DOCUMENT_KIND_LABELS[document.documentKind]} ·{" "}
                {formatDocumentSizeLabel(document.byteSize)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
