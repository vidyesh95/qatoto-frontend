import type { Metadata } from "next";
import DailyPage from "@/components/home/anime/pages/daily-page";

export const metadata: Metadata = {
  title: "Daily",
  description: "Daily anime release schedule for Qatoto",
};

export default function Daily() {
  return <DailyPage />;
}
