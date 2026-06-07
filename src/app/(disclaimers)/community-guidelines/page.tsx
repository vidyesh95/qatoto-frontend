import CommunityGuidelines from "@/components/disclaimers/community-guidelines";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "Community Guidelines page for Qatoto",
};

export default function CommunityGuidelinesPage() {
  return <CommunityGuidelines />;
}
