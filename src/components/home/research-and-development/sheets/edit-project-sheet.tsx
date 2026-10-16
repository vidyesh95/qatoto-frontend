// TRANSPORT: props-only — the trigger, its role gate and the sheet's frame. The editor, and every
// write, load on first open from `edit-project-form.tsx`.
"use client";

import { useState } from "react";

import RndSheet from "@/components/home/research-and-development/sheets/rnd-sheet";
import { createLazySheetBody } from "@/components/home/shared/lazy-overlay";
import type { ResearchProjectDetail } from "@/lib/rnd/projects.schemas";

const { LazyOverlay: LazyProjectEditorContent, preload: preloadProjectEditorContent } =
  createLazySheetBody(
    () => import("@/components/home/research-and-development/sheets/edit-project-form"),
  );

/** Founder and maintainer edit; only the founder publishes or moves the stage. */
const EDIT_ROLES = ["founder", "admin", "maintainer"];

function canEdit(viewerProjectRole: string | null): boolean {
  return viewerProjectRole !== null && EDIT_ROLES.includes(viewerProjectRole);
}

/** Edit the project. Why it is four writes rather than one submit is documented in `edit-project-form.tsx`. */
export default function EditProjectSheet({ project }: { project: ResearchProjectDetail }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!canEdit(project.viewerProjectRole)) return null;

  return (
    <>
      <button
        type="button"
        onPointerEnter={preloadProjectEditorContent}
        onFocus={preloadProjectEditorContent}
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer rounded-full border border-outline-strong px-4 py-2 text-sm font-medium text-primary-imprint"
      >
        Edit project
      </button>

      <RndSheet title="Edit project" isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}>
        {isSheetOpen && <LazyProjectEditorContent key={project.slug} project={project} />}
      </RndSheet>
    </>
  );
}
