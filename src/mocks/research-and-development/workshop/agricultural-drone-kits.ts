import type { ProjectWorkshop } from "@/types/research-and-development";

export const AGRICULTURAL_DRONE_KITS_WORKSHOP: ProjectWorkshop = {
  projectId: "agricultural-drone-kits",
  boardColumns: [
    {
      id: "drone-column-to-do",
      title: "To do",
      tasks: [
        {
          id: "drone-task-flight-permits",
          title: "File flight-test permits for the Cusco valley",
          assigneeMemberId: "lucia-herrera",
          priority: "high",
          labels: ["Regulatory"],
          dueDateLabel: "Jul 13",
        },
        {
          id: "drone-task-kit-packaging",
          title: "Spec the flat-pack kit packaging",
          assigneeMemberId: "camila-rojas",
          priority: "low",
          labels: ["Design"],
        },
      ],
    },
    {
      id: "drone-column-in-progress",
      title: "In progress",
      tasks: [
        {
          id: "drone-task-camera-calibration",
          title: "Calibrate the multispectral camera rig",
          assigneeMemberId: "diego-fernandez",
          priority: "high",
          labels: ["Prototype"],
          dueDateLabel: "Jul 11",
        },
        {
          id: "drone-task-assembly-guide",
          title: "Illustrate the farmer assembly guide, steps 1–12",
          assigneeMemberId: "camila-rojas",
          priority: "medium",
          labels: ["Design", "Docs"],
        },
        {
          id: "drone-task-firmware-failsafe",
          title: "Implement the low-battery return-home failsafe",
          assigneeMemberId: "mateo-villanueva",
          priority: "high",
          labels: ["Firmware"],
          dueDateLabel: "Jul 12",
        },
      ],
    },
    {
      id: "drone-column-done",
      title: "Done",
      tasks: [
        {
          id: "drone-task-frame-stress",
          title: "Stress-test the folding frame hinges",
          assigneeMemberId: "diego-fernandez",
          priority: "medium",
          labels: ["Prototype"],
        },
      ],
    },
  ],
  files: [
    {
      id: "drone-file-frame-cad",
      fileName: "folding-frame-rev5.step",
      fileKind: "cad-model",
      fileSizeLabel: "18.9 MB",
      uploadedByMemberId: "diego-fernandez",
      uploadedDateLabel: "Jul 2",
    },
    {
      id: "drone-file-assembly-guide",
      fileName: "assembly-guide-draft.pdf",
      fileKind: "document",
      fileSizeLabel: "5.6 MB",
      uploadedByMemberId: "camila-rojas",
      uploadedDateLabel: "Jul 5",
    },
    {
      id: "drone-file-flight-log",
      fileName: "test-flight-telemetry.xlsx",
      fileKind: "spreadsheet",
      fileSizeLabel: "920 KB",
      uploadedByMemberId: "mateo-villanueva",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "drone-file-field-footage",
      fileName: "valley-test-flight.mp4",
      fileKind: "video",
      fileSizeLabel: "112 MB",
      uploadedByMemberId: "diego-fernandez",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "drone-file-ndvi-sample",
      fileName: "ndvi-sample-pass.avif",
      fileKind: "image",
      fileSizeLabel: "2.7 MB",
      uploadedByMemberId: "diego-fernandez",
      uploadedDateLabel: "Jul 7",
    },
  ],
  chatMessages: [
    {
      id: "drone-chat-1",
      authorMemberId: "mateo-villanueva",
      sentAtLabel: "Jul 6, 7:55 AM",
      messageText: "Failsafe branch is up — return-home triggers at 18% battery in the sim.",
    },
    {
      id: "drone-chat-2",
      authorMemberId: "diego-fernandez",
      sentAtLabel: "Jul 6, 9:30 AM",
      messageText: "Valley flight footage uploaded. NDVI pass over the potato plots looks clean.",
    },
    {
      id: "drone-chat-3",
      authorMemberId: "camila-rojas",
      sentAtLabel: "Jul 6, 1:15 PM",
      messageText:
        "Assembly guide steps 1–8 illustrated. Hinge step needs a callout — farmers kept flipping it in testing.",
    },
    {
      id: "drone-chat-4",
      authorMemberId: "lucia-herrera",
      sentAtLabel: "Jul 7, 10:40 AM",
      messageText: "Permit paperwork ready for signatures; filing window opens Monday.",
    },
    {
      id: "drone-chat-5",
      authorMemberId: "mateo-villanueva",
      sentAtLabel: "Jul 7, 3:05 PM",
      messageText: "Let's demo the failsafe on Wednesday's flight if the permit lands.",
    },
  ],
};
