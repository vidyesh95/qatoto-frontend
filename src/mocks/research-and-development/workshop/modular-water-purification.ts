import type { ProjectWorkshop } from "@/types/research-and-development";

export const MODULAR_WATER_PURIFICATION_WORKSHOP: ProjectWorkshop = {
  projectId: "modular-water-purification",
  boardColumns: [
    {
      id: "water-column-to-do",
      title: "To do",
      tasks: [
        {
          id: "water-task-arsenic-media",
          title: "Source arsenic adsorption media samples",
          assigneeMemberId: "arjun-mehta",
          priority: "high",
          labels: ["Sourcing", "Lab"],
          dueDateLabel: "Jul 14",
        },
        {
          id: "water-task-household-interviews",
          title: "Schedule 20 household interviews in Khulna",
          assigneeMemberId: "nusrat-jahan",
          priority: "medium",
          labels: ["Research"],
          dueDateLabel: "Jul 16",
        },
      ],
    },
    {
      id: "water-column-in-progress",
      title: "In progress",
      tasks: [
        {
          id: "water-task-flow-rig",
          title: "Assemble the bench flow-rate test rig",
          assigneeMemberId: "arjun-mehta",
          priority: "high",
          labels: ["Prototype"],
          dueDateLabel: "Jul 10",
        },
        {
          id: "water-task-validation-protocol",
          title: "Write the field validation protocol",
          assigneeMemberId: "farhana-rahman",
          priority: "medium",
          labels: ["Lab", "Docs"],
        },
      ],
    },
    {
      id: "water-column-done",
      title: "Done",
      tasks: [
        {
          id: "water-task-groundwater-map",
          title: "Map arsenic readings across the pilot villages",
          assigneeMemberId: "nusrat-jahan",
          priority: "medium",
          labels: ["Research"],
        },
      ],
    },
  ],
  files: [
    {
      id: "water-file-readings",
      fileName: "khulna-groundwater-readings.xlsx",
      fileKind: "spreadsheet",
      fileSizeLabel: "2.1 MB",
      uploadedByMemberId: "nusrat-jahan",
      uploadedDateLabel: "Jul 3",
    },
    {
      id: "water-file-cartridge-cad",
      fileName: "filter-cartridge-housing-rev2.step",
      fileKind: "cad-model",
      fileSizeLabel: "11.4 MB",
      uploadedByMemberId: "arjun-mehta",
      uploadedDateLabel: "Jul 5",
    },
    {
      id: "water-file-protocol-draft",
      fileName: "field-validation-protocol-draft.pdf",
      fileKind: "document",
      fileSizeLabel: "480 KB",
      uploadedByMemberId: "farhana-rahman",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "water-file-rig-photo",
      fileName: "bench-rig-assembly.avif",
      fileKind: "image",
      fileSizeLabel: "3.2 MB",
      uploadedByMemberId: "arjun-mehta",
      uploadedDateLabel: "Jul 7",
    },
  ],
  chatMessages: [
    {
      id: "water-chat-1",
      authorMemberId: "farhana-rahman",
      sentAtLabel: "Jul 6, 8:40 AM",
      messageText:
        "Protocol draft is up — please mark any step that needs lab gear we don't have yet.",
    },
    {
      id: "water-chat-2",
      authorMemberId: "arjun-mehta",
      sentAtLabel: "Jul 6, 10:05 AM",
      messageText: "Flow rig is half assembled; missing the 12V pump, arriving Thursday.",
    },
    {
      id: "water-chat-3",
      authorMemberId: "nusrat-jahan",
      sentAtLabel: "Jul 6, 4:18 PM",
      messageText:
        "Village readings mapped — three wells exceed 3× the WHO arsenic limit. Prioritising those for interviews.",
    },
    {
      id: "water-chat-4",
      authorMemberId: "farhana-rahman",
      sentAtLabel: "Jul 7, 9:00 AM",
      messageText: "Good. Those three become our validation sites if the media samples arrive.",
    },
    {
      id: "water-chat-5",
      authorMemberId: "arjun-mehta",
      sentAtLabel: "Jul 7, 12:30 PM",
      messageText: "Two media suppliers replied — sample kits shipping next week.",
    },
  ],
};
