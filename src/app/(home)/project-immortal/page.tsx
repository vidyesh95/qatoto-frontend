import { redirect } from "next/navigation";

/**
 * The original top-level URL, from before Project Immortal moved under the R&D surface.
 *
 * Points STRAIGHT at the final path rather than at the intermediate
 * `/research-and-development/projects/project-immortal`, which is itself now a redirect — two
 * hops for one bookmark is a round trip nobody needs.
 */
export default function ProjectImmortalLegacyRoute() {
  redirect("/research-and-development/programs/project-immortal");
}
