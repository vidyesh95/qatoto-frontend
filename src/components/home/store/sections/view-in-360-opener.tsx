// TRANSPORT: props-only — holds the open/closed state for the 3D viewer sheet.
"use client";

// The client half of the "View in 360º" card in `product-detail.tsx` (A47).
//
// Split out so the PAGE can stay a server component: the card is server-rendered markup handed in
// as `children`, and only "does the sheet exist right now" is client state. The sheet — and with
// it the viewer and its three.js chunk — mounts only after the click.

import { useState } from "react";
import type { ReactNode } from "react";

import ThreeDimensionalModelViewerSheet from "@/components/home/store/sheets/three-dimensional-model-viewer-sheet";
import type { ProductThreeDimensionalModel } from "@/lib/store/products.schemas";

export default function ViewIn360Opener({
  model,
  posterImageUrl,
  productTitle,
  children,
}: {
  readonly model: ProductThreeDimensionalModel;
  readonly posterImageUrl: string | null;
  readonly productTitle: string;
  readonly children: ReactNode;
}) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsViewerOpen(true)}
        aria-haspopup="dialog"
        className="w-full cursor-pointer text-left"
      >
        {children}
      </button>

      {isViewerOpen && (
        <ThreeDimensionalModelViewerSheet
          model={model}
          posterImageUrl={posterImageUrl}
          productTitle={productTitle}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}
