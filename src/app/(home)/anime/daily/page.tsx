import type { Metadata } from "next";
import DailyContent from "@/components/home/daily-content";

export const metadata: Metadata = {
  title: "Daily",
  description: "Daily anime release schedule for Qatoto",
};

export default function Daily() {
  return <DailyContent />;
}
