import type { ProjectWorkshop } from "@/types/research-and-development";

export const E_WASTE_RECYCLING_LINE_WORKSHOP: ProjectWorkshop = {
  projectId: "e-waste-recycling-line",
  boardColumns: [
    {
      id: "ewaste-column-to-do",
      title: "To do",
      tasks: [
        {
          id: "ewaste-task-collector-onboarding",
          title: "Design the informal-collector onboarding flow",
          assigneeMemberId: "efua-boateng",
          priority: "high",
          labels: ["Community"],
          dueDateLabel: "Jul 16",
        },
        {
          id: "ewaste-task-refiner-loi",
          title: "Get letters of intent from two metal refiners",
          assigneeMemberId: "kwame-mensah",
          priority: "high",
          labels: ["Sales"],
          dueDateLabel: "Jul 20",
        },
      ],
    },
    {
      id: "ewaste-column-in-progress",
      title: "In progress",
      tasks: [
        {
          id: "ewaste-task-shredder-install",
          title: "Install and commission the board shredder",
          assigneeMemberId: "chidi-nwosu",
          priority: "high",
          labels: ["Plant"],
          dueDateLabel: "Jul 11",
        },
        {
          id: "ewaste-task-safety-audit",
          title: "Run the fume-extraction safety audit",
          assigneeMemberId: "fatima-diallo",
          priority: "medium",
          labels: ["Safety"],
        },
      ],
    },
    {
      id: "ewaste-column-done",
      title: "Done",
      tasks: [
        {
          id: "ewaste-task-intake-scale",
          title: "Calibrate the intake weighing station",
          assigneeMemberId: "chidi-nwosu",
          priority: "low",
          labels: ["Plant"],
        },
      ],
    },
  ],
  files: [
    {
      id: "ewaste-file-plant-layout",
      fileName: "recovery-line-layout.pdf",
      fileKind: "document",
      fileSizeLabel: "2.4 MB",
      uploadedByMemberId: "chidi-nwosu",
      uploadedDateLabel: "Jul 3",
    },
    {
      id: "ewaste-file-yield-model",
      fileName: "metal-yield-model.xlsx",
      fileKind: "spreadsheet",
      fileSizeLabel: "1.1 MB",
      uploadedByMemberId: "kwame-mensah",
      uploadedDateLabel: "Jul 5",
    },
    {
      id: "ewaste-file-safety-checklist",
      fileName: "fume-extraction-audit-checklist.pdf",
      fileKind: "document",
      fileSizeLabel: "220 KB",
      uploadedByMemberId: "fatima-diallo",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "ewaste-file-shredder-clip",
      fileName: "shredder-first-run.mp4",
      fileKind: "video",
      fileSizeLabel: "64.8 MB",
      uploadedByMemberId: "chidi-nwosu",
      uploadedDateLabel: "Jul 7",
    },
  ],
  chatMessages: [
    {
      id: "ewaste-chat-1",
      authorMemberId: "chidi-nwosu",
      sentAtLabel: "Jul 7, 8:05 AM",
      messageText: "Shredder first run done — clip in files. Throughput hit 180 kg/hr on boards.",
    },
    {
      id: "ewaste-chat-2",
      authorMemberId: "fatima-diallo",
      sentAtLabel: "Jul 7, 8:52 AM",
      messageText:
        "Extraction audit is halfway — one duct needs resealing before we run at full speed.",
    },
    {
      id: "ewaste-chat-3",
      authorMemberId: "kwame-mensah",
      sentAtLabel: "Jul 7, 10:15 AM",
      messageText: "Refiner in Tema wants a 50 kg copper-fraction sample before signing the LOI.",
    },
    {
      id: "ewaste-chat-4",
      authorMemberId: "efua-boateng",
      sentAtLabel: "Jul 7, 12:44 PM",
      messageText:
        "Met the Agbogbloshie collectors' association — they'll pilot the onboarding flow with 15 members.",
    },
    {
      id: "ewaste-chat-5",
      authorMemberId: "kwame-mensah",
      sentAtLabel: "Jul 7, 1:10 PM",
      messageText: "Great — that's enough intake volume for the refiner sample this month.",
    },
  ],
};
