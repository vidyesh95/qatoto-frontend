import Press from "@/components/information/press";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press | Qatoto",
  description: "Press page for Qatoto",
};

export default function PressPage() {
  return <Press />;
}
