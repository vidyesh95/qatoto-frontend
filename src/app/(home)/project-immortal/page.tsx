import { redirect } from "next/navigation";

// Project Immortal moved under the R&D surface. Keep the old URL working for
// bookmarks and links that predate the move.
export default function ProjectImmortalLegacyRoute() {
  redirect("/research-and-development/projects/project-immortal");
}
