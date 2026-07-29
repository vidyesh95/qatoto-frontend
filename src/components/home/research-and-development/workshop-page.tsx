// TRANSPORT: server-fetch — server component with three client-query islands nested
// inside it (the task composer, the file linker and the chat composer).
// Reads GET /research-projects/:slug
// (public) for the header and roster, then GET …/workshop (member-only) for the
// content. See docs/R_AND_D_STRUCTURE.md §19 for the transport map.
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import WorkshopBoard from "@/components/home/research-and-development/sections/workshop-board";
import WorkshopChat from "@/components/home/research-and-development/sections/workshop-chat";
import WorkshopBoardControls from "@/components/home/research-and-development/sections/workshop-board-controls";
import WorkshopChatComposer from "@/components/home/research-and-development/sections/workshop-chat-composer";
import WorkshopFileLinker from "@/components/home/research-and-development/sections/workshop-file-linker";
import WorkshopTaskComposer from "@/components/home/research-and-development/sections/workshop-task-composer";
import WorkshopFiles from "@/components/home/research-and-development/sections/workshop-files";
import WorkshopTabs from "@/components/home/research-and-development/sections/workshop-tabs";
import { getResearchProjectDetail } from "@/lib/rnd/projects.api";
import { getProjectWorkshop } from "@/lib/rnd/workshop.api";
import { isUnauthorized, type ApiError } from "@/lib/http";
import { callerRequestOptions } from "@/lib/server-http";

/**
 * The Virtual Workshop — the project team's boards, files and chat.
 *
 * TWO READS, IN THIS ORDER, FOR A REASON. The public detail read resolves the project
 * and supplies the roster every panel needs to turn a `memberId` into a name; its 404
 * is `notFound()` and leaks nothing. The workshop read then runs behind membership at
 * role `contributor` and answers 404 to everyone else. Because the project is already
 * known to exist by then, saying "this is the team's space" is safe here — a
 * non-member sees the real project header above an honest explanation, rather than a
 * blank 404 for a project they can browse elsewhere.
 *
 * The whole workshop is ONE request: the backend composes board, files, chat and read
 * state from four concurrent service calls, so fanning out client-side would be three
 * round trips for a payload the server already assembles.
 */
export default async function WorkshopPage({ projectSlug }: { projectSlug: string }) {
  const requestOptions = await callerRequestOptions();
  const detailResult = await getResearchProjectDetail(projectSlug, requestOptions);

  if (!detailResult.success) {
    if (detailResult.error.code === "404") notFound();
    return (
      <div className="px-4 pt-6 lg:px-6">
        <RndErrorPanel message="Couldn't load this project." />
      </div>
    );
  }

  const project = detailResult.data;
  const workshopResult = await getProjectWorkshop(projectSlug, requestOptions);

  return (
    <div className="space-y-6 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <header className="space-y-1 px-4 lg:px-6">
        <Link
          href={`/research-and-development/project/${project.slug}`}
          className="text-xs font-medium text-[#00696E]"
        >
          ← {project.name}
        </Link>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Virtual Workshop</h1>
        <p className="text-sm text-muted-foreground">
          Where the {project.name} team plans, shares, and talks — boards, files, and chat.
        </p>
      </header>
      {workshopResult.success ? (
        <WorkshopTabs
          boardsPanel={
            <div className="space-y-3">
              <WorkshopBoard boardColumns={workshopResult.data.board} teamMembers={project.team} />
              <div className="px-4 lg:px-6">
                <WorkshopTaskComposer
                  projectSlug={projectSlug}
                  columns={workshopResult.data.board}
                />
              </div>
              <WorkshopBoardControls
                projectSlug={projectSlug}
                boardColumns={workshopResult.data.board}
              />
            </div>
          }
          filesPanel={
            <div className="space-y-3">
              <WorkshopFiles files={workshopResult.data.files} teamMembers={project.team} />
              <div className="px-4 lg:px-6">
                <WorkshopFileLinker projectSlug={projectSlug} />
              </div>
            </div>
          }
          chatPanel={
            <div className="space-y-3">
              <WorkshopChat
                chatMessages={workshopResult.data.chatMessages}
                teamMembers={project.team}
              />
              <div className="px-4 lg:px-6">
                <WorkshopChatComposer
                  projectSlug={projectSlug}
                  latestMessageId={workshopResult.data.chatMessages.at(-1)?.id ?? null}
                />
              </div>
            </div>
          }
        />
      ) : (
        <div className="px-4 lg:px-6">{renderWorkshopRefusal(workshopResult.error)}</div>
      )}
    </div>
  );
}

/** 404 here means "not a member"; the project's existence was settled by the read above. */
function renderWorkshopRefusal(error: ApiError) {
  if (isUnauthorized(error)) {
    return <RndSignInRequiredPanel message="Sign in to open this project's workshop." />;
  }
  if (error.code === "404") {
    return (
      <RndMembersOnlyPanel message="The workshop is open to this project's team — boards, files and chat stay inside it." />
    );
  }
  return <RndErrorPanel message="Couldn't load the workshop." />;
}
