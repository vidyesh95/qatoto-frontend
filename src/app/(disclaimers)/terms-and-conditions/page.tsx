import TermsAndConditions from "@/components/disclaimers/terms-and-conditions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms And Conditions | Qatoto",
  description: "Terms And Conditions page for Qatoto",
};

export default function TermsAndConditionsPage() {
  return <TermsAndConditions />;
}
