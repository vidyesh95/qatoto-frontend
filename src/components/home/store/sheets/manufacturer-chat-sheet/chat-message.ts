// A message is a sender + one content kind. Modeled as a discriminated union so
// the render switch is exhaustive and no impossible bubble can exist.
export type ChatMessage = {
  id: string;
  sender: "buyer" | "manufacturer" | "qatoto";
  time: string;
} & (
  | { kind: "text"; text: string }
  | { kind: "image"; imageSrc: string; caption?: string }
  // Mock videos carry a poster image (imageSrc); user-picked videos carry a
  // playable object-URL (videoSrc) instead. Exactly one is set in practice.
  | { kind: "video"; imageSrc?: string; videoSrc?: string; caption?: string }
  | { kind: "document"; fileName: string; fileMeta: string }
);

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    sender: "qatoto",
    time: "10 Jun 2026 · 09:12",
    kind: "text",
    text: "Qatoto opened this thread to verify the dispute. Share photos, videos, or invoices as evidence — both parties can see everything here.",
  },
  {
    id: "m2",
    sender: "buyer",
    time: "10 Jun 2026 · 09:14",
    kind: "text",
    text: "Two chairs arrived with a scratched frame. Sending photos now.",
  },
  {
    id: "m3",
    sender: "buyer",
    time: "10 Jun 2026 · 09:15",
    kind: "image",
    imageSrc: "/dummy/chair_charcoal_black.avif",
    caption: "Scratch on the left leg.",
  },
  {
    id: "m4",
    sender: "manufacturer",
    time: "10 Jun 2026 · 11:02",
    kind: "text",
    text: "Thanks. Our QC video for this batch is attached — please confirm the unit number.",
  },
  {
    id: "m5",
    sender: "manufacturer",
    time: "10 Jun 2026 · 11:03",
    kind: "video",
    imageSrc: "/dummy/stacking_chair.avif",
    caption: "Pre-shipment QC · batch #LV-2291",
  },
  {
    id: "m6",
    sender: "manufacturer",
    time: "10 Jun 2026 · 11:04",
    kind: "document",
    fileName: "LV-folding-chair-catalog-2026.pdf",
    fileMeta: "PDF · 4.2 MB · 18 pages",
  },
  {
    id: "m7",
    sender: "buyer",
    time: "10 Jun 2026 · 14:27",
    kind: "text",
    text: "Unit numbers match. Requesting replacement for the two damaged sets.",
  },
];
