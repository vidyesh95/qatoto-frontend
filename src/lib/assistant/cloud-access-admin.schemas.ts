// TRANSPORT: props-only — schemas only.
//
// PREMIUM AI GRANTS, AS THE ADMIN QUEUE READS THEM. Staff-only: nothing under
// `src/components/home` or `src/components/studio` may import this file — it carries account
// emails, and member surfaces only ever learn their OWN `hasCloudAccess` (`cloud-brain.api.ts`).

import { z } from "zod";

export const CloudAccessGrantSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  handle: z.string().nullable(),
  grantedAt: z.iso.datetime(),
  note: z.string().nullable(),
  /** Null once the staff member who granted it has been anonymized. */
  grantedBy: z.object({ userId: z.string(), name: z.string() }).nullable(),
});

export type CloudAccessGrant = z.infer<typeof CloudAccessGrantSchema>;

export const GrantCloudAccessResultSchema = z.object({
  userId: z.string(),
  grantedAt: z.iso.datetime(),
});

export const RevokeCloudAccessResultSchema = z.object({ revokedAt: z.iso.datetime() });

export const CLOUD_ACCESS_NOTE_MAXIMUM_LENGTH = 200;
