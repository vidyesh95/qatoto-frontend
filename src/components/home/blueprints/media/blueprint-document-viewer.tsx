// TRANSPORT: props-only — the document arrives from `blueprint-document-list`.
"use client";

import ModalSheet from "@/components/home/shared/modal-sheet";
import type { BlueprintDocument } from "@/lib/blueprints/schemas";

/**
 * One published PDF, read in place.
 *
 * `<embed type="application/pdf">` AND NOTHING ELSE. There is no PDF dependency in this repo and
 * this does not add one: `pdf.js` is roughly 350 KB of client JavaScript to render a document
 * every browser on this list already renders natively. `certification-review-page.tsx:444-484` is
 * the existing precedent, including the branch below.
 *
 * THE FALLBACK IS NOT DECORATION. A browser with the PDF viewer disabled — and every iOS in-app
 * webview — renders `<embed>` as a blank rectangle with no error, so a viewer without this branch
 * looks like a broken page rather than an unsupported one. The download always works.
 */
export default function BlueprintDocumentViewer({
  document: blueprintDocument,
  onClose,
}: {
  readonly document: BlueprintDocument;
  readonly onClose: () => void;
}) {
  return (
    <ModalSheet
      title={blueprintDocument.title}
      onClose={onClose}
      isFixedHeight
      widthClassName="sm:w-[min(90vw,56rem)]"
      footer={
        <a
          href={blueprintDocument.url}
          download
          className="block rounded-full bg-[#00696E] px-4 py-2 text-center text-sm font-medium text-white"
        >
          Download
        </a>
      }
    >
      <embed
        src={blueprintDocument.url}
        type="application/pdf"
        title={blueprintDocument.title}
        className="h-full w-full"
      />
      <p className="px-4 py-3 text-xs leading-4 text-[#6F7979]">
        Nothing above? This browser will not display a PDF inline — use Download.
      </p>
    </ModalSheet>
  );
}
