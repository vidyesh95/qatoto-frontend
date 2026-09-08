// TRANSPORT: props-only — the fabrication downloads. Arrives from the teardown detail page.

import Image from "next/image";

import { formatFileSizeFromBytes } from "@/lib/blueprints/format";
import {
  TEARDOWN_MANUFACTURING_BUNDLE_LABELS,
  TEARDOWN_MANUFACTURING_BUNDLES,
  TEARDOWN_MANUFACTURING_FILE_BUNDLES,
  TEARDOWN_MANUFACTURING_FILE_KIND_LABELS,
  type TeardownManufacturingFile,
} from "@/lib/blueprints/schemas";

/**
 * A SERVER COMPONENT, unlike `BlueprintDocumentList` next door, and the difference is the whole
 * reason the two lists were never merged. A document is a PDF with a View button that opens it in
 * a sheet, which needs an island to hold the open row; a STEP file or a Gerber has no inline
 * reading at all. These rows are links and nothing else.
 *
 * ⚠️ `download` WORKS HERE BECAUSE THE FIXTURES ARE SITE-RELATIVE. Browsers ignore the attribute
 * cross-origin, so the day these come from Cloudinary the server has to send
 * `Content-Disposition: attachment` instead — the same trap `store/sections/product-documents.tsx`
 * records against the product document list.
 */
export default function ManufacturingFileBundles({
  manufacturingFiles,
}: {
  readonly manufacturingFiles: readonly TeardownManufacturingFile[];
}) {
  if (manufacturingFiles.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">Manufacturing files</h2>
      <p className="mt-0.5 text-[11px] text-[#6F7979]">
        What a machine shop or a board house builds from.
      </p>

      <div className="mt-2 max-w-2xl space-y-4">
        {TEARDOWN_MANUFACTURING_BUNDLES.map((bundle) => {
          const bundleFiles = manufacturingFiles.filter(
            (file) => TEARDOWN_MANUFACTURING_FILE_BUNDLES[file.kind] === bundle,
          );
          // A bundle nobody published gets no heading rather than an empty one.
          if (bundleFiles.length === 0) return null;

          return (
            <div key={bundle}>
              <h3 className="font-mono text-[10px] tracking-[0.12em] text-[#6F7979] uppercase">
                {TEARDOWN_MANUFACTURING_BUNDLE_LABELS[bundle]}
              </h3>
              <ul className="mt-1.5 space-y-2">
                {bundleFiles.map((file) => (
                  <li
                    key={file.id}
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
                      <p className="truncate text-sm text-foreground">{file.title}</p>
                      <p className="mt-0.5 text-[11px] text-[#6F7979]">
                        {TEARDOWN_MANUFACTURING_FILE_KIND_LABELS[file.kind]}
                        {" · "}
                        {formatFileSizeFromBytes(file.byteSize)}
                      </p>
                    </div>
                    <a
                      href={file.url}
                      download
                      aria-label={`Download ${file.title}`}
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
