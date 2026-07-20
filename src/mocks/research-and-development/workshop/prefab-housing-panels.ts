import type { ProjectWorkshop } from "@/types/research-and-development";

export const PREFAB_HOUSING_PANELS_WORKSHOP: ProjectWorkshop = {
  projectId: "prefab-housing-panels",
  boardColumns: [
    {
      id: "prefab-column-to-do",
      title: "To do",
      tasks: [
        {
          id: "prefab-task-typhoon-rating",
          title: "Book the wind-load certification lab slot",
          assigneeMemberId: "josef-tan",
          priority: "high",
          labels: ["Certification"],
          dueDateLabel: "Jul 17",
        },
        {
          id: "prefab-task-community-training",
          title: "Outline the community assembly-training day",
          assigneeMemberId: "kim-reyes",
          priority: "medium",
          labels: ["Community"],
        },
      ],
    },
    {
      id: "prefab-column-in-progress",
      title: "In progress",
      tasks: [
        {
          id: "prefab-task-joint-redesign",
          title: "Redesign the panel-to-panel joint for hand tools",
          assigneeMemberId: "anh-nguyen",
          priority: "high",
          labels: ["Design"],
          dueDateLabel: "Jul 12",
        },
        {
          id: "prefab-task-line-layout",
          title: "Lay out the Tacloban micro-factory line",
          assigneeMemberId: "rafael-cruz",
          priority: "medium",
          labels: ["Manufacturing"],
        },
      ],
    },
    {
      id: "prefab-column-done",
      title: "Done",
      tasks: [
        {
          id: "prefab-task-panel-pour",
          title: "Pour and cure the first 20 wall panels",
          assigneeMemberId: "rafael-cruz",
          priority: "high",
          labels: ["Manufacturing"],
        },
        {
          id: "prefab-task-demo-unit",
          title: "Erect the demo unit at the barangay hall",
          assigneeMemberId: "maricel-santos",
          priority: "medium",
          labels: ["Community"],
        },
      ],
    },
  ],
  files: [
    {
      id: "prefab-file-joint-cad",
      fileName: "panel-joint-rev4.step",
      fileKind: "cad-model",
      fileSizeLabel: "9.8 MB",
      uploadedByMemberId: "anh-nguyen",
      uploadedDateLabel: "Jul 4",
    },
    {
      id: "prefab-file-line-layout",
      fileName: "micro-factory-line-layout.pdf",
      fileKind: "document",
      fileSizeLabel: "1.3 MB",
      uploadedByMemberId: "rafael-cruz",
      uploadedDateLabel: "Jul 5",
    },
    {
      id: "prefab-file-cure-log",
      fileName: "panel-cure-log.xlsx",
      fileKind: "spreadsheet",
      fileSizeLabel: "310 KB",
      uploadedByMemberId: "rafael-cruz",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "prefab-file-demo-photos",
      fileName: "barangay-demo-unit.avif",
      fileKind: "image",
      fileSizeLabel: "4.1 MB",
      uploadedByMemberId: "kim-reyes",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "prefab-file-assembly-clip",
      fileName: "two-person-assembly-timelapse.mp4",
      fileKind: "video",
      fileSizeLabel: "86.4 MB",
      uploadedByMemberId: "maricel-santos",
      uploadedDateLabel: "Jul 7",
    },
  ],
  chatMessages: [
    {
      id: "prefab-chat-1",
      authorMemberId: "maricel-santos",
      sentAtLabel: "Jul 6, 8:10 AM",
      messageText:
        "Demo unit drew a crowd at the barangay hall — three families asked about the waitlist.",
    },
    {
      id: "prefab-chat-2",
      authorMemberId: "anh-nguyen",
      sentAtLabel: "Jul 6, 11:25 AM",
      messageText:
        "Joint rev4 assembles with just a mallet and socket wrench. CAD uploaded for review.",
    },
    {
      id: "prefab-chat-3",
      authorMemberId: "josef-tan",
      sentAtLabel: "Jul 6, 2:50 PM",
      messageText: "Certification lab has an opening Jul 22 — booking it unless anyone objects.",
    },
    {
      id: "prefab-chat-4",
      authorMemberId: "rafael-cruz",
      sentAtLabel: "Jul 7, 9:35 AM",
      messageText: "All 20 panels cured within tolerance. Cure log is in files.",
    },
    {
      id: "prefab-chat-5",
      authorMemberId: "kim-reyes",
      sentAtLabel: "Jul 7, 1:20 PM",
      messageText:
        "Training-day outline drafted — pairing each new family with someone from the demo build.",
    },
    {
      id: "prefab-chat-6",
      authorMemberId: "maricel-santos",
      sentAtLabel: "Jul 7, 1:32 PM",
      messageText: "Perfect. Timelapse of the two-person assembly is up — use it in the training.",
    },
  ],
};
