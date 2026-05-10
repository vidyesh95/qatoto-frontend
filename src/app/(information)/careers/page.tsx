import Careers from "@/components/information/careers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | Qatoto",
  description: "Careers page for Qatoto",
};

export default function CareersPage() {
  return <Careers />;
}
