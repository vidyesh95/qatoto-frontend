// TRANSPORT: props-only — pure pattern matching. No network, no browser API.
//
// The contact-detail screen on a problem report's Title and Description (`docs/GEOLOCATION_PRIVACY.md`
// §5). The first report of a problem is published VERBATIM — a new cluster copies the submission's
// title and description — so a phone number typed there becomes a public phone number.
//
// ⚠️ **ADVISORY ONLY, AND IT NEVER BLOCKS SUBMIT.** It is not a business rule, so there is nothing
// for the backend to re-validate: a regex in the browser is bypassed by anyone with devtools, and
// the patterns misfire on date ranges and long ID numbers. A council helpline number can also
// belong in a report. The screen tells the reporter what it saw; the reporter decides.
//
// TWO DEPARTURES FROM §5, BOTH DELIBERATE:
//   1. The obfuscated-address pattern only matches BRACKETED or PARENTHESISED `at` / `dot`. §5's
//      `\bat\b … \bdot\b` flags ordinary prose ("at the market dot…").
//   2. One sentence naming everything found, instead of §5's per-kind "Please remove…" imperatives:
//      the text is a guess, so the copy says "looks like", and only the first report's text becomes
//      the cluster's, so it says "can appear".

export const CONTACT_DETAIL_KINDS = ["phone_number", "email_address"] as const;
export type ContactDetailKind = (typeof CONTACT_DETAIL_KINDS)[number];

/** Ten or more digits, allowing the separators people type between them. §5's pattern. */
const PHONE_NUMBER_PATTERN = /(?:\+?\d[\s.()-]*){10,}/;

/** A plain email address. §5's pattern. */
const EMAIL_ADDRESS_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

/** `name [at] domain [dot] com` and `name (at) domain (dot) com` — tightened from §5, see above. */
const OBFUSCATED_EMAIL_ADDRESS_PATTERN =
  /[\w.+-]+\s*[[(]\s*at\s*[\])]\s*[\w-]+\s*[[(]\s*dot\s*[\])]/i;

const CONTACT_DETAIL_PATTERNS_BY_KIND: Record<ContactDetailKind, readonly RegExp[]> = {
  phone_number: [PHONE_NUMBER_PATTERN],
  email_address: [EMAIL_ADDRESS_PATTERN, OBFUSCATED_EMAIL_ADDRESS_PATTERN],
};

const CONTACT_DETAIL_NOUNS_BY_KIND: Record<ContactDetailKind, string> = {
  phone_number: "a phone number",
  email_address: "an email address",
};

/** The kinds of contact detail the text appears to contain, in `CONTACT_DETAIL_KINDS` order. */
export function detectContactDetailKinds(text: string): readonly ContactDetailKind[] {
  return CONTACT_DETAIL_KINDS.filter((contactDetailKind) =>
    CONTACT_DETAIL_PATTERNS_BY_KIND[contactDetailKind].some((pattern) => pattern.test(text)),
  );
}

/** One sentence naming what was found, or `null` when nothing was. */
export function formatContactDetailAdvisory(
  contactDetailKinds: readonly ContactDetailKind[],
): string | null {
  if (contactDetailKinds.length === 0) return null;
  const foundDetailsLabel = contactDetailKinds
    .map((contactDetailKind) => CONTACT_DETAIL_NOUNS_BY_KIND[contactDetailKind])
    .join(" and ");
  return `This looks like it contains ${foundDetailsLabel}. Reports can appear publicly on the problem map, so leave out personal contact details.`;
}
