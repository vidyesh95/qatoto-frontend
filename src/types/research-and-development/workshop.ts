// Project Virtual Workshop (task board, files, chat). Data truth lives in the
// Express backend; these shapes are the client-side contract only.
// UI-building phase: consumed from static mocks in
// `src/mocks/research-and-development-mocks.ts`, no fetch layer yet.

export type WorkshopTaskPriority = "high" | "medium" | "low";

export type WorkshopTask = {
  id: string;
  title: string;
  // Resolves against the owning project's teamMembers.
  assigneeMemberId: string;
  priority: WorkshopTaskPriority;
  labels: string[];
  dueDateLabel?: string;
};

export type WorkshopBoardColumn = {
  id: string;
  title: string;
  tasks: WorkshopTask[];
};

export type WorkshopFileKind = "document" | "spreadsheet" | "cad-model" | "image" | "video";

export type WorkshopFile = {
  id: string;
  fileName: string;
  fileKind: WorkshopFileKind;
  // Display-formatted, e.g. "2.4 MB".
  fileSizeLabel: string;
  uploadedByMemberId: string;
  uploadedDateLabel: string;
};

export type WorkshopChatMessage = {
  id: string;
  authorMemberId: string;
  // Display-formatted, e.g. "Jul 7, 9:42 AM".
  sentAtLabel: string;
  messageText: string;
};

// Static mock of a project's Virtual Workshop (boards, files, chat). All
// collaboration data is backend-owned later — the frontend only renders it.
export type ProjectWorkshop = {
  // Matches ResearchProject.id.
  projectId: string;
  boardColumns: WorkshopBoardColumn[];
  files: WorkshopFile[];
  chatMessages: WorkshopChatMessage[];
};
