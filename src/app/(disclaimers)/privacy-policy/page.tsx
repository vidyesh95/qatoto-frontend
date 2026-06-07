import PrivacyPolicy from "@/components/disclaimers/privacy-policy";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy page for Qatoto",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
