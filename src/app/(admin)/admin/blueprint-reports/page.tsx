// TODO: Cache Components adoption — this route opts out of `instant` because its whole body is a
// capability-gated client console, which has nothing a static shell could usefully hold.
export const instant = false;

import BlueprintModerationPage from "@/components/admin/blueprint-reports/blueprint-moderation-page";

export const metadata = {
  title: "Blueprint reports",
  description: "Reader reports about published teardowns and case studies.",
};

export default function BlueprintReportsRoute() {
  return <BlueprintModerationPage />;
}
