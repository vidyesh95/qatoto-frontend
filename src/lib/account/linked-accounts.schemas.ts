// TRANSPORT: props-only — a schema, no network of its own.
//
// Client contract for `GET /users/me/linked-accounts`.
//
// ONE ROW PER PROVIDER, NOT PER USER. Account linking in Better Auth means several `account` rows
// pointing at the same `userId`, so this list has a `credential` row when the user has set an email
// + password, a `google` row when Google is linked, and a `github` row when GitHub is. THE
// PRESENCE OF A ROW IS THE ANSWER — "is a password set" is `accountsByProvider.has("credential")`,
// which is why the four surfaces that ask it all read this one endpoint.
//
// `email` IS NULLABLE AND THAT IS NOT AN OVERSIGHT. It is the address that PROVIDER knows the user
// by, written once at account creation from the provider profile. Credential rows carry NULL —
// their address is `user.email`. Never fabricate one: a null here means the provider never told us,
// not that there is no address (CLAUDE.md — never fabricate a value the server returned as null).
//
// THIS SCHEMA WAS DEFINED INLINE IN `menus/settings-menu.tsx` until several surfaces needed it.

import { z } from "zod";

/** One linked provider. `.strip()` so a backend that adds a field does not break this client. */
export const LinkedAccountSchema = z
  .object({
    /** `"credential"` | `"google"` | `"github"` — kept a string, since the backend owns the set. */
    providerId: z.string(),
    email: z.string().nullable(),
  })
  .strip();

export const LinkedAccountListSchema = z.array(LinkedAccountSchema);

export type LinkedAccount = z.infer<typeof LinkedAccountSchema>;
