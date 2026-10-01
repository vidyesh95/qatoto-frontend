"use client";

import Image from "next/image";
import Link from "next/link";
import { ComposerStepRail } from "@/components/commerce/composer/composer-fields";
import { useCreateListingState } from "@/hooks/studio/use-create-listing-state";
import { describeProgress, LISTING_STEPS } from "../listing/listing-editor-types";
import { PublishRefusalNotice } from "../listing/listing-editor-subcomponents";
import { ListingStepView } from "../listing/listing-step-view";

function ListingPublishedView({ productTitle }: { readonly productTitle: string }) {
  return (
    <div className="p-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-2xl border border-border py-24">
        <span className="flex size-32 items-center justify-center rounded-full bg-secondary">
          <Image
            src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={48}
            height={48}
          />
        </span>
        <p className="text-lg font-medium text-foreground">Your listing has been published</p>
        <p className="text-sm text-muted-foreground">
          {productTitle.trim() || "Your product"} is now live on the Qatoto Store.
        </p>
        <Link
          href="/studio/products"
          className="mt-2 flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Back to My Products
        </Link>
      </div>
    </div>
  );
}

function ListingLoadingView() {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-24">
        <p className="text-sm text-muted-foreground">Loading listing…</p>
      </div>
    </div>
  );
}

function ListingErrorView() {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-24">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this listing.</p>
        <Link
          href="/studio/products"
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          Back to My Products
        </Link>
      </div>
    </div>
  );
}

function ListingFooterNavigation({
  state,
}: {
  readonly state: ReturnType<typeof useCreateListingState>;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        type="button"
        onClick={state.handleBackClick}
        className={`cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 ${
          state.currentStepIndex === 0 ? "invisible" : ""
        }`}
      >
        Back
      </button>

      {state.isLastStep ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => state.handleSave(false)}
            disabled={state.isSaving}
            className="cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.isEditMode ? "Save Changes" : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => state.handleSave(true)}
            disabled={state.isSaving || state.publishBlockReason !== null}
            title={state.publishBlockReason ?? undefined}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Image
              src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
            {state.isSaving ? "Publishing…" : "Publish Listing"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={state.handleNextClick}
          className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Next: {LISTING_STEPS[state.currentStepIndex + 1].label}
        </button>
      )}
    </div>
  );
}

export default function CreateListingPage({ productId }: { productId?: string }) {
  const state = useCreateListingState(productId);

  if (state.isPublished) {
    return <ListingPublishedView productTitle={state.productTitle} />;
  }

  if (state.isEditMode && state.productQuery.isPending) {
    return <ListingLoadingView />;
  }

  if (state.isEditMode && state.productQuery.isError) {
    return <ListingErrorView />;
  }

  return (
    <div className="p-6">
      <Link
        href="/studio/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Image
          src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={18}
          height={18}
        />
        Back to products
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        {state.isEditMode ? "Edit Store Listing" : "Create Store Listing"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        List your product on the Qatoto Store to reach buyers, partners, and B2B customers.
      </p>

      {/* Step tabs */}
      <div className="mt-8">
        <ComposerStepRail
          steps={LISTING_STEPS}
          currentStepIndex={state.currentStepIndex}
          onStepSelect={state.handleGoToStepClick}
        />
      </div>

      <div className="mt-6">
        <ListingStepView stepId={state.currentStep.id} state={state} />
      </div>

      {state.isLastStep && state.localError !== null && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.localError}
        </p>
      )}
      {state.isLastStep && state.localError === null && state.publishRefusal !== null && (
        <PublishRefusalNotice refusal={state.publishRefusal} />
      )}
      {state.isSaving && (
        <p className="mt-4 text-sm text-muted-foreground">{describeProgress(state.saveProgress)}</p>
      )}

      {/* Footer navigation */}
      <ListingFooterNavigation state={state} />
    </div>
  );
}
