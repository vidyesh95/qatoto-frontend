import type { ProjectWorkshop } from "@/types/research-and-development";

export const SOLAR_COLD_STORAGE_WORKSHOP: ProjectWorkshop = {
  projectId: "solar-cold-storage",
  boardColumns: [
    {
      id: "solar-column-to-do",
      title: "To do",
      tasks: [
        {
          id: "solar-task-insulation-supplier",
          title: "Shortlist insulation panel suppliers in Nairobi",
          assigneeMemberId: "grace-muthoni",
          priority: "medium",
          labels: ["Sourcing"],
          dueDateLabel: "Jul 15",
        },
        {
          id: "solar-task-pilot-agreements",
          title: "Draft pilot agreements for the three Nakuru sites",
          assigneeMemberId: "wanjiru-kamau",
          priority: "high",
          labels: ["Pilot", "Legal"],
          dueDateLabel: "Jul 18",
        },
      ],
    },
    {
      id: "solar-column-in-progress",
      title: "In progress",
      tasks: [
        {
          id: "solar-task-compressor-bench",
          title: "Bench-test the DC compressor at 40°C ambient",
          assigneeMemberId: "daniel-otieno",
          priority: "high",
          labels: ["Prototype"],
          dueDateLabel: "Jul 11",
        },
        {
          id: "solar-task-cost-model-v2",
          title: "Update unit cost model with panel quotes",
          assigneeMemberId: "samuel-kiprop",
          priority: "medium",
          labels: ["Finance"],
        },
      ],
    },
    {
      id: "solar-column-done",
      title: "Done",
      tasks: [
        {
          id: "solar-task-demand-survey",
          title: "Compile the 400-farmer demand survey results",
          assigneeMemberId: "grace-muthoni",
          priority: "medium",
          labels: ["Research"],
        },
        {
          id: "solar-task-thermal-sim",
          title: "Run thermal simulation on the 200L cabinet",
          assigneeMemberId: "daniel-otieno",
          priority: "low",
          labels: ["Prototype"],
        },
      ],
    },
  ],
  files: [
    {
      id: "solar-file-demand-survey",
      fileName: "farmer-demand-survey-results.xlsx",
      fileKind: "spreadsheet",
      fileSizeLabel: "1.8 MB",
      uploadedByMemberId: "grace-muthoni",
      uploadedDateLabel: "Jul 5",
    },
    {
      id: "solar-file-cabinet-cad",
      fileName: "cold-cabinet-200l-rev3.step",
      fileKind: "cad-model",
      fileSizeLabel: "24.6 MB",
      uploadedByMemberId: "daniel-otieno",
      uploadedDateLabel: "Jul 6",
    },
    {
      id: "solar-file-pilot-brief",
      fileName: "nakuru-pilot-brief.pdf",
      fileKind: "document",
      fileSizeLabel: "640 KB",
      uploadedByMemberId: "wanjiru-kamau",
      uploadedDateLabel: "Jul 4",
    },
    {
      id: "solar-file-bench-clip",
      fileName: "compressor-bench-run.mp4",
      fileKind: "video",
      fileSizeLabel: "58.2 MB",
      uploadedByMemberId: "daniel-otieno",
      uploadedDateLabel: "Jul 7",
    },
  ],
  chatMessages: [
    {
      id: "solar-chat-1",
      authorMemberId: "daniel-otieno",
      sentAtLabel: "Jul 7, 9:12 AM",
      messageText:
        "Bench run at 40°C holds 4°C inside the cabinet on 310W — better than the sim predicted.",
    },
    {
      id: "solar-chat-2",
      authorMemberId: "wanjiru-kamau",
      sentAtLabel: "Jul 7, 9:20 AM",
      messageText: "That's the number we quote the pilot farmers. Clip uploaded to files?",
    },
    {
      id: "solar-chat-3",
      authorMemberId: "daniel-otieno",
      sentAtLabel: "Jul 7, 9:24 AM",
      messageText: "Yes — compressor-bench-run.mp4. Watch the frost pattern at 02:10.",
    },
    {
      id: "solar-chat-4",
      authorMemberId: "samuel-kiprop",
      sentAtLabel: "Jul 7, 11:02 AM",
      messageText:
        "Panel quotes came in 8% under the cost model. Updating the sheet this afternoon.",
    },
    {
      id: "solar-chat-5",
      authorMemberId: "grace-muthoni",
      sentAtLabel: "Jul 7, 2:45 PM",
      messageText:
        "Two of the Nakuru cooperatives want to co-sign the pilot agreement — sending intro notes.",
    },
  ],
};
