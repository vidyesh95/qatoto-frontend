// TRANSPORT: server-fetch — async server component. Reads `listCaseStudyOptions` from
// `@/lib/blueprints/case-study-public.api`, which calls the Express backend, and hands the options
// to the client composer.
//
// THE SELECT NOW NAMES ROWS THAT EXIST, and it has to: the backend refuses a submission whose
// related slug does not name a case study a reader can reach, and it answers that as a 422 keyed to
// `relatedLessonSlugs`. Offered fixture slugs, the form could produce a payload the server rejects
// through no fault of the writer.

import CaseStudyComposer from "@/components/home/blueprints/case-studies/authoring/case-study-composer";
import { listCaseStudyOptions } from "@/lib/blueprints/case-study-public.api";

/**
 * The server half of the case-study form: it reads the lessons a new one may link as related, and
 * nothing else. A slug and a title per case study cross to the client, never a whole row.
 */
export default async function CaseStudyAuthoringPage() {
  /*
   * AN EMPTY LIST ON FAILURE, NOT A BLOCKED FORM. `relatedLessonSlugs` is optional, so a writer
   * whose only problem is that this one read failed can still send their case study without linking
   * a related lesson — a better answer than refusing the whole composer over a field they may not
   * have been going to fill in.
   */
  const optionsResponse = await listCaseStudyOptions();
  const caseStudyOptions = optionsResponse.success ? optionsResponse.data : [];
  return <CaseStudyComposer caseStudyOptions={caseStudyOptions} />;
}
