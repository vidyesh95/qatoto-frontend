// TRANSPORT: mock — async server component. Reads `listCaseStudyOptions` from `@/lib/blueprints/api`,
// which serves fixtures, and hands the options to the client composer.

import CaseStudyComposer from "@/components/home/blueprints/case-studies/authoring/case-study-composer";
import { listCaseStudyOptions } from "@/lib/blueprints/api";

/**
 * The server half of the case-study form: it reads the lessons a new one may link as related, and
 * nothing else. A slug and a title per case study cross to the client, never a whole row.
 */
export default async function CaseStudyAuthoringPage() {
  const caseStudyOptions = await listCaseStudyOptions();
  return <CaseStudyComposer caseStudyOptions={caseStudyOptions} />;
}
