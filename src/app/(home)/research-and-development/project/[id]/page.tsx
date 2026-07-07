import type { Metadata } from "next";

import ProjectDetail from "@/components/home/research-and-development/pages/project-detail";
import { MOCK_RESEARCH_PROJECTS } from "@/lib/research-and-development-mocks";

// Prerender every mock project slug — required for a dynamic route under
// cacheComponents.
export function generateStaticParams() {
  return MOCK_RESEARCH_PROJECTS.map((project) => ({ id: project.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = MOCK_RESEARCH_PROJECTS.find((candidateProject) => candidateProject.id === id);
  return { title: `${project?.name ?? "Project"} · R&D` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}
