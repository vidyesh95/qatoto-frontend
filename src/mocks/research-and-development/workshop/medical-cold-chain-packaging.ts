import type { ProjectWorkshop } from "@/types/research-and-development";

export const MEDICAL_COLD_CHAIN_PACKAGING_WORKSHOP: ProjectWorkshop = {
  projectId: "medical-cold-chain-packaging",
  boardColumns: [
    {
      id: "medical-column-to-do",
      title: "To do",
      tasks: [
        {
          id: "medical-task-distributor-onboarding",
          title: "Onboard the second EU pharma distributor",
          assigneeMemberId: "elise-moreau",
          priority: "high",
          labels: ["Sales"],
          dueDateLabel: "Jul 19",
        },
        {
          id: "medical-task-returns-program",
          title: "Design the reusable-shipper returns program",
          assigneeMemberId: "ingrid-sorensen",
          priority: "medium",
          labels: ["Logistics"],
        },
      ],
    },
    {
      id: "medical-column-in-progress",
      title: "In progress",
      tasks: [
        {
          id: "medical-task-96h-validation",
          title: "Run the 96-hour thermal validation batch",
          assigneeMemberId: "jonas-weber",
          priority: "high",
          labels: ["Validation"],
          dueDateLabel: "Jul 12",
        },
        {
          id: "medical-task-gdp-dossier",
          title: "Assemble the GDP compliance dossier",
          assigneeMemberId: "ingrid-sorensen",
          priority: "high",
          labels: ["Regulatory"],
          dueDateLabel: "Jul 15",
        },
      ],
    },
    {
      id: "medical-column-done",
      title: "Done",
      tasks: [
        {
          id: "medical-task-72h-validation",
          title: "Pass the 72-hour thermal validation",
          assigneeMemberId: "jonas-weber",
          priority: "high",
          labels: ["Validation"],
        },
        {
          id: "medical-task-first-po",
          title: "Ship the first distributor purchase order",
          assigneeMemberId: "elise-moreau",
          priority: "medium",
          labels: ["Sales"],
        },
      ],
    },
  ],
  files: [
    {
      id: "medical-file-thermal-data",
      fileName: "96h-thermal-validation-data.xlsx",
      fileKind: "spreadsheet",
      fileSizeLabel: "3.4 MB",
      uploadedByMemberId: "jonas-weber",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "medical-file-gdp-dossier",
      fileName: "gdp-compliance-dossier-draft.pdf",
      fileKind: "document",
      fileSizeLabel: "8.9 MB",
      uploadedByMemberId: "ingrid-sorensen",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "medical-file-shipper-cad",
      fileName: "reusable-shipper-shell-rev6.step",
      fileKind: "cad-model",
      fileSizeLabel: "15.2 MB",
      uploadedByMemberId: "jonas-weber",
      uploadedDateLabel: "Jul 4",
    },
    {
      id: "medical-file-line-photo",
      fileName: "lyon-packing-line.avif",
      fileKind: "image",
      fileSizeLabel: "2.9 MB",
      uploadedByMemberId: "elise-moreau",
      uploadedDateLabel: "Jul 5",
    },
  ],
  chatMessages: [
    {
      id: "medical-chat-1",
      authorMemberId: "jonas-weber",
      sentAtLabel: "Jul 6, 9:18 AM",
      messageText:
        "96-hour batch is 60 hours in — internal temp still within ±0.4°C of the 5°C setpoint.",
    },
    {
      id: "medical-chat-2",
      authorMemberId: "ingrid-sorensen",
      sentAtLabel: "Jul 6, 10:47 AM",
      messageText: "GDP dossier draft uploaded. Missing only the transport-lane risk assessments.",
    },
    {
      id: "medical-chat-3",
      authorMemberId: "elise-moreau",
      sentAtLabel: "Jul 6, 3:22 PM",
      messageText:
        "Second distributor call went well — they want the 96-hour data before committing volume.",
    },
    {
      id: "medical-chat-4",
      authorMemberId: "jonas-weber",
      sentAtLabel: "Jul 7, 8:30 AM",
      messageText: "They'll have it Friday if the batch finishes clean.",
    },
    {
      id: "medical-chat-5",
      authorMemberId: "ingrid-sorensen",
      sentAtLabel: "Jul 7, 11:55 AM",
      messageText:
        "Returns-program sketch: deposit per shipper, courier-collected, refurbished on the Lyon line.",
    },
  ],
};
