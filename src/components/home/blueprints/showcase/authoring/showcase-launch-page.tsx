// TRANSPORT: mock — async server component. Reads `listTeardownOptions` from `@/lib/blueprints/api`,
// which serves fixtures, and hands the options to the client composer.

import ShowcaseLaunchComposer from "@/components/home/blueprints/showcase/authoring/showcase-launch-composer";
import { listTeardownOptions } from "@/lib/blueprints/api";

/**
 * The server half of the launch form: it reads the teardowns a launch may name as its source and
 * nothing else. A slug and a title per teardown cross to the client, never a whole row.
 */
export default async function ShowcaseLaunchPage() {
  const teardownOptions = await listTeardownOptions();
  return <ShowcaseLaunchComposer teardownOptions={teardownOptions} />;
}
