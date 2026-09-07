// TRANSPORT: props-only — chrome around ThreeDimensionalModelViewer; fetches nothing.
"use client";

import ModalSheet from "@/components/home/shared/modal-sheet";
import ThreeDimensionalModelViewer from "@/components/home/store/sections/three-dimensional-model-viewer";
import { formatByteSizeLabel } from "@/lib/store/format";
import type { ProductThreeDimensionalModel } from "@/lib/store/products.schemas";

/**
 * "View in 360º", opened from the card under the gallery (A47).
 *
 * `isFixedHeight` and the PDF viewer's width, for the PDF viewer's reasons: a viewer must not
 * resize under the buyer's cursor while the mesh loads, and at the default `sm:w-md` a chair is a
 * thumbnail. The caption names the file and its size so a buyer on a metered connection knows what
 * the poster is about to become. Nothing here says the file was scanned, because it was not.
 */
export default function ThreeDimensionalModelViewerSheet({
  model,
  posterImageUrl,
  productTitle,
  onClose,
}: {
  readonly model: ProductThreeDimensionalModel;
  readonly posterImageUrl: string | null;
  readonly productTitle: string;
  readonly onClose: () => void;
}) {
  return (
    <ModalSheet
      title="View in 360º"
      onClose={onClose}
      isFixedHeight
      widthClassName="sm:w-[min(90vw,56rem)]"
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">
          <ThreeDimensionalModelViewer
            modelUrl={model.url}
            posterImageUrl={posterImageUrl}
            alternateText={`${productTitle}, 3D model`}
          />
        </div>
        <p className="shrink-0 px-4 py-3 text-xs leading-4 text-[#6F7979]">
          Drag to rotate · scroll or pinch to zoom · {model.fileName} (
          {formatByteSizeLabel(model.byteSize)})
        </p>
      </div>
    </ModalSheet>
  );
}
