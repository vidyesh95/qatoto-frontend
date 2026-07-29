// TRANSPORT: server-fetch — server component. Reads GET /suppliers,
// GET /supplier-capabilities, GET /launch-ready-projects and GET /discovery/regions via
// @/lib/rnd/*.api, with the session cookie forwarded by callerRequestOptions(). All four
// are public. No React Query here.
import CreateListingCtaBand from "@/components/home/research-and-development/sections/create-listing-cta-band";
import GoToMarketExplainer from "@/components/home/research-and-development/sections/go-to-market-explainer";
import GoToMarketHero from "@/components/home/research-and-development/sections/go-to-market-hero";
import LaunchReadinessChecklist from "@/components/home/research-and-development/sections/launch-readiness-checklist";
import LaunchReadyProjectsRail from "@/components/home/research-and-development/sections/launch-ready-projects-rail";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import SupplierDirectory from "@/components/home/research-and-development/sections/supplier-directory";
import { listDiscoveryRegions } from "@/lib/rnd/discovery.api";
import {
  listLaunchReadyProjects,
  listSupplierCapabilities,
  listSuppliers,
} from "@/lib/rnd/suppliers.api";
import {
  readEnumParam,
  readMultiParam,
  readSingleParam,
  type RawSearchParams,
} from "@/lib/rnd/filter-href";
import {
  SUPPLIER_VERIFICATION_STATES,
  type ListSuppliersFilter,
} from "@/lib/rnd/suppliers.schemas";
import { rowsOrEmpty, toListViewState } from "@/lib/rnd/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const SUPPLIERS_PAGE_LIMIT = 24;
const LAUNCH_READY_LIMIT = 12;

/**
 * Stage 06 — Go-to-Market (§4c.4). The last stage and the bridge out of R&D into
 * commerce, so the page ends on `/studio/products`.
 *
 * Listing creation is not an R&D concern: the studio already owns pricing, ownership and
 * validation for a product, and proxying a create through a research route would duplicate
 * all three. R&D contributes `product.researchProjectId` and the link.
 *
 * THE READINESS CHECKLIST TAKES NO DATA. `…/launch-readiness` is member-only and answers
 * 404 to everyone else, and this page holds no slug — so the section explains the six
 * derived gates instead of previewing someone else's figures. A member sees their own
 * checklist inside their project.
 */
export default async function GoToMarketPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestOptions = await callerRequestOptions();

  const suppliersFilter: ListSuppliersFilter = {
    limit: SUPPLIERS_PAGE_LIMIT,
    capability: readMultiParam(resolvedSearchParams, "capability"),
    region: readSingleParam(resolvedSearchParams, "region"),
    verificationState: readEnumParam(
      resolvedSearchParams,
      "verificationState",
      SUPPLIER_VERIFICATION_STATES,
    ),
  };

  const [suppliersResult, capabilitiesResult, launchReadyResult, regionsResult] = await Promise.all(
    [
      listSuppliers(suppliersFilter, requestOptions),
      listSupplierCapabilities(requestOptions),
      listLaunchReadyProjects({ limit: LAUNCH_READY_LIMIT }, requestOptions),
      listDiscoveryRegions({}, requestOptions),
    ],
  );

  const suppliersState = toListViewState(suppliersResult);
  const launchReadyState = toListViewState(launchReadyResult);
  // Secondary reads: losing either costs a chip row, not the directory.
  const capabilities = rowsOrEmpty(capabilitiesResult);
  const regions = rowsOrEmpty(regionsResult);

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <GoToMarketHero />
      <GoToMarketExplainer />
      <LaunchReadinessChecklist />

      {suppliersState.status === "error" ? (
        <div className="px-4 lg:px-6">
          <RndErrorPanel message="Couldn't load the supplier directory." />
        </div>
      ) : (
        <SupplierDirectory
          suppliers={suppliersState.status === "ready" ? suppliersState.rows : []}
          capabilities={capabilities}
          regions={regions}
          pagination={suppliersState.status === "ready" ? suppliersState.pagination : null}
          searchParams={resolvedSearchParams}
        />
      )}

      {/* The rail owns its own "no project has reached this stage yet" copy, so an empty
          result goes through it rather than through a status panel. */}
      <LaunchReadyProjectsRail
        projects={launchReadyState.status === "ready" ? launchReadyState.rows : []}
      />
      <CreateListingCtaBand />
    </div>
  );
}
