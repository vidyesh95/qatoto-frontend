// TRANSPORT: server-fetch — async server component. Reads `listTeardownOptions` from
// `@/lib/blueprints/teardown-public.api`, which calls the Express backend, and hands the options to
// the client composer.

import ShowcaseLaunchComposer from "@/components/home/blueprints/showcase/authoring/showcase-launch-composer";
import { listTeardownOptions } from "@/lib/blueprints/teardown-public.api";

/**
 * The server half of the launch form: it reads the teardowns a launch may name as its source and
 * nothing else. A slug and a title per teardown cross to the client, never a whole row.
 *
 * THE SELECT NOW NAMES ROWS THAT EXIST. It listed fixture slugs until this read went remote, which
 * meant `builtFromBlueprintSlug` could be submitted naming a teardown the backend had never heard
 * of — the server stores that field as free text and always will, so nothing downstream would have
 * caught it.
 *
 * ⚠️ AN EMPTY LIST ON FAILURE, NOT A BLOCKED FORM. `builtFromBlueprintSlug` is optional, so a maker
 * whose only problem is that this one read failed can still post their launch without naming a
 * source — which is a better answer than refusing the whole composer over a field they may not have
 * been going to fill in.
 */
export default async function ShowcaseLaunchPage() {
  const optionsResponse = await listTeardownOptions();
  const teardownOptions = optionsResponse.success ? optionsResponse.data : [];
  return <ShowcaseLaunchComposer teardownOptions={teardownOptions} />;
}
