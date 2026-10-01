"use client";

import type { SellerProductRelation } from "@/lib/products/schemas";
import type { RelationDraft } from "../listing-editor-types";
import { RelationRows, StepCard } from "../listing-editor-subcomponents";

export interface RelationsStepProps {
  readonly relations: readonly RelationDraft[];
  readonly readOnlyRelations: readonly SellerProductRelation[];
  readonly onRelationsChange: (relations: RelationDraft[]) => void;
}

export function RelationsStep({
  relations,
  readOnlyRelations,
  onRelationsChange,
}: RelationsStepProps) {
  return (
    <StepCard
      title="Related products"
      subtitle="What goes with this, what replaces it, what it is a spare part for. Buyers see these under “View similar” and in the compare tray."
    >
      {/*
        ⚠️ A DECLARATION, NOT A FACT, AND THE COPY SAYS SO. The server stores these as
        `seller_declared` and the buyer's sheet captions them that way — only a moderator can
        promote one to a confirmed fit. Wording this as certainty would be the claim §15.3
        exists to prevent.
      */}
      <RelationRows
        relations={relations}
        readOnlyRelations={readOnlyRelations}
        onRelationsChange={onRelationsChange}
      />
    </StepCard>
  );
}
