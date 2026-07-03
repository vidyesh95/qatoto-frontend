import type { Metadata } from "next";
import SubmissionsQueue from "@/components/studio/queue/submissions-queue";

export const metadata: Metadata = {
  title: "Queue",
  description: "Anime episode submissions awaiting review in Qatoto Creator Studio",
};

export default function StudioQueue() {
  return <SubmissionsQueue />;
}
