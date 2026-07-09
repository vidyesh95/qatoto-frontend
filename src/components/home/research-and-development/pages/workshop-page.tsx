import Link from "next/link";
import { notFound } from "next/navigation";

import WorkshopBoard from "@/components/home/research-and-development/sections/workshop-board";
import WorkshopChat from "@/components/home/research-and-development/sections/workshop-chat";
import WorkshopFiles from "@/components/home/research-and-development/sections/workshop-files";
import WorkshopTabs from "@/components/home/research-and-development/sections/workshop-tabs";
import { MOCK_RESEARCH_PROJECTS } from "@/lib/research-and-development-mocks";
import { MOCK_PROJECT_WORKSHOPS } from "@/lib/research-and-development-workshop-mocks";

// Virtual Workshop composition (§11): the project team's collab space —
// boards, files, chat — as three server-rendered panels behind a small tabs
// island (same handoff as project-detail → project-tabs). All collaboration
// data is a static mock this phase.
export default function WorkshopPage({ projectId }: { projectId: string }) {
  const project = MOCK_RESEARCH_PROJECTS.find(
    (candidateProject) => candidateProject.id === projectId,
  );
  const workshop = MOCK_PROJECT_WORKSHOPS.find(
    (candidateWorkshop) => candidateWorkshop.projectId === projectId,
  );
  if (!project || !workshop) notFound();

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-1 px-4 pt-2 lg:px-6">
        <Link
          href={`/research-and-development/project/${project.id}`}
          className="text-xs font-medium text-[#00696E]"
        >
          ← {project.name}
        </Link>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Virtual Workshop</h1>
        <p className="text-sm text-muted-foreground">
          Where the {project.name} team plans, shares, and talks — boards, files, and chat.
        </p>
      </header>
      <WorkshopTabs
        boardsPanel={
          <WorkshopBoard boardColumns={workshop.boardColumns} teamMembers={project.teamMembers} />
        }
        filesPanel={<WorkshopFiles files={workshop.files} teamMembers={project.teamMembers} />}
        chatPanel={
          <WorkshopChat chatMessages={workshop.chatMessages} teamMembers={project.teamMembers} />
        }
      />
    </div>
  );
}
