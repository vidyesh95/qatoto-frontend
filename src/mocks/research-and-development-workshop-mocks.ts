// Mock Virtual Workshop data (boards, files, chat) for the UI-building phase.
// Kept out of research-and-development-mocks.ts only for file size — same
// convention: fixtures, no getters. Every assignee/author/uploader id resolves
// to a teamMembers[].id on the matching project in that file.

import type { ProjectWorkshop } from "@/types/research-and-development";

export const MOCK_PROJECT_WORKSHOPS: ProjectWorkshop[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
        messageText:
          "Perfect. Timelapse of the two-person assembly is up — use it in the training.",
      },
    ],
  },
  {
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
  },
  {
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
        messageText:
          "GDP dossier draft uploaded. Missing only the transport-lane risk assessments.",
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
  },
];
