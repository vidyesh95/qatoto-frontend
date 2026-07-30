import { redirect } from "next/navigation";

/**
 * Project Immortal is now ONE ROW in the generic `/programs` surface rather than a hardcoded
 * page, so its URL moved. This keeps the old one working for bookmarks, the sidebar entry that
 * predates the move, and the links in `src/components/information/*`.
 *
 * A slug is unwritable after creation (§ wire casing), so `project-immortal` is stable and this
 * redirect will not rot.
 */
export default function ProjectImmortalMovedRoute() {
  redirect("/research-and-development/programs/project-immortal");
}
