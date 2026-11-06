// TRANSPORT: server-fetch — server component. Reads GET /research-projects/:slug and its public
// roles via @/lib/rnd/projects.api. No session is forwarded: this page is the same for everyone,
// and `join-project-actions.tsx` decides what a signed-in viewer can do.
import Image from "next/image";
import { notFound } from "next/navigation";

import OpenRoleCard from "@/components/home/research-and-development/cards/open-role-card";
import JoinProjectActions from "@/components/home/research-and-development/sections/join-project-actions";
import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import { readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { getResearchProjectDetail, listProjectOpenRoles } from "@/lib/rnd/projects.api";
import { rowsOrEmpty } from "@/lib/view-state";

const FALLBACK_COVER_IMAGE_SRC = "/dummy/rnd_project_cover_01.avif";

/**
 * Where a founder's invite link lands, for somebody who may never have heard of Qatoto.
 *
 * THIS IS NOT A SECRET LINK, AND THAT IS DELIBERATE. The founder approves everyone, so all this page
 * adds to the public project page is a welcome and a form that is already open. Anybody holding the
 * address can do what any visitor could already do, which is ask.
 *
 * A DRAFT 404s, as it does on the project page, because a draft is visible to its founder alone.
 */
export default async function JoinProjectPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<RawSearchParams>;
}) {
  const [{ id: projectSlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const [detailResult, openRolesResult] = await Promise.all([
    getResearchProjectDetail(projectSlug),
    listProjectOpenRoles(projectSlug),
  ]);

  if (!detailResult.success) {
    if (detailResult.error.code === "404") notFound();
    return (
      <div className="px-4 pt-6 lg:px-6">
        <RndErrorPanel message="Couldn't load this project." />
      </div>
    );
  }

  const project = detailResult.data;
  const openRoles = rowsOrEmpty(openRolesResult).filter((role) => role.status === "open");
  const founderName = project.team.find((member) => member.isFounder)?.name ?? null;

  const requestedRoleId = readSingleParam(resolvedSearchParams, "role");
  const invitedRole = openRoles.find((role) => role.id === requestedRoleId) ?? null;

  const joinPagePath = `/research-and-development/project/${project.slug}/join`;
  const returnPath = invitedRole === null ? joinPagePath : `${joinPagePath}?role=${invitedRole.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <div className="relative mx-4 h-48 overflow-hidden rounded-2xl md:h-64 lg:mx-6">
        <Image
          src={project.coverImageUrl ?? FALLBACK_COVER_IMAGE_SRC}
          fill
          priority
          sizes="(min-width: 768px) 768px, 100vw"
          alt={project.name}
          className="object-cover"
        />
      </div>

      <section className="space-y-3 px-4 lg:px-6">
        <p className="text-sm text-muted-foreground">
          {founderName === null ? "You were invited to join" : `${founderName} invited you to join`}
          {invitedRole !== null && ` as ${invitedRole.roleTitle}`}
        </p>
        <h1 className="text-2xl font-medium tracking-tight text-foreground lg:text-3xl">
          {project.name}
        </h1>
        <p className="text-sm text-muted-foreground">{project.tagline}</p>
        <JoinProjectActions
          projectSlug={project.slug}
          invitedRole={invitedRole}
          returnPath={returnPath}
        />
        <p className="text-xs text-muted-foreground">
          The founder reviews every request. Joining a team does not by itself give you pay or
          equity, so agree that with them before you start.
        </p>
      </section>

      {invitedRole === null && openRoles.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-4 text-sm font-medium tracking-wide lg:px-6 xl:text-lg">Open roles</h2>
          <div className="flex gap-3 overflow-x-auto px-4 pt-1 pb-2 lg:px-6">
            {openRoles.map((role) => (
              <OpenRoleCard key={role.id} role={role} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
