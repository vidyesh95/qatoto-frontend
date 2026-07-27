import CreateListingCtaBand from "@/components/home/research-and-development/sections/create-listing-cta-band";
import GoToMarketExplainer from "@/components/home/research-and-development/sections/go-to-market-explainer";
import GoToMarketHero from "@/components/home/research-and-development/sections/go-to-market-hero";
import LaunchReadinessChecklist from "@/components/home/research-and-development/sections/launch-readiness-checklist";
import LaunchReadyProjectsRail from "@/components/home/research-and-development/sections/launch-ready-projects-rail";
import SupplierDirectory from "@/components/home/research-and-development/sections/supplier-directory";
import {
  MOCK_LAUNCH_READINESS_BY_PROJECT_ID,
  MOCK_RESEARCH_PROJECTS,
  MOCK_SUPPLIER_CAPABILITIES,
  MOCK_SUPPLIER_PROFILES,
} from "@/mocks/research-and-development-mocks";

// Stage 06 — Go-to-Market (R_AND_D_STRUCTURE.md §4c.4). The last stage and the
// bridge out of R&D into commerce, so the page ends on /studio/products.
//
// Listing creation is not an R&D concern: the studio already owns pricing,
// ownership and validation for a product, and proxying a create through a
// research route would duplicate all three. R&D contributes the link.
export default function GoToMarketPage() {
  const launchReadyProjects = MOCK_RESEARCH_PROJECTS.filter(
    (project) => project.stage === "go-to-market",
  );
  const showcaseProject = launchReadyProjects[0];
  const showcaseReadiness = showcaseProject
    ? MOCK_LAUNCH_READINESS_BY_PROJECT_ID[showcaseProject.id]
    : undefined;

  return (
    <div className="space-y-8 pb-8">
      <GoToMarketHero />
      <GoToMarketExplainer />
      {showcaseProject && showcaseReadiness && (
        <LaunchReadinessChecklist
          readiness={showcaseReadiness}
          projectName={showcaseProject.name}
        />
      )}
      <SupplierDirectory
        suppliers={MOCK_SUPPLIER_PROFILES}
        capabilities={MOCK_SUPPLIER_CAPABILITIES}
      />
      <LaunchReadyProjectsRail projects={launchReadyProjects} />
      <CreateListingCtaBand />
    </div>
  );
}
