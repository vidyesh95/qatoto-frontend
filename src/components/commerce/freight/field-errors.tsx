// TRANSPORT: props-only — renders an already-fetched error record. No network, no state.

/**
 * Field errors from a refused write, INCLUDING THE RESERVED `form` KEY.
 *
 * A `.strict()` rejection — an unknown, misspelled, or server-owned key the caller is not allowed
 * to send — is an OBJECT-level parse issue, so it lands under `errors.form` rather than under any
 * field name. A renderer that only walked named fields would show a bare "422" with the actual
 * reason invisible, which is the failure this function exists to prevent.
 *
 * ⚠️ IT MATTERS MOST ON THE PROVIDER SURFACE (§19.12), where `providerOrganizationId` and
 * `sourceForwarderName` are REFUSED rather than ignored: both arrive here under `form`, naming the
 * key. A composer that rendered nothing for `form` would tell a forwarder their whole tariff was
 * rejected and not why.
 *
 * SHARED between the staff console and the forwarder's composer, which is why it sits under
 * `components/commerce/**` rather than inside either one. It was already imported by two siblings
 * from the admin composer it used to live in.
 */
export function renderFieldErrors(fieldErrors: Record<string, string[]> | undefined) {
  if (fieldErrors === undefined) return null;
  const entries = Object.entries(fieldErrors);
  if (entries.length === 0) return null;

  return (
    <ul className="space-y-0.5 text-xs">
      {entries.map(([fieldName, messages]) => (
        <li key={fieldName}>
          <span className="font-medium">{fieldName === "form" ? "Request" : fieldName}:</span>{" "}
          {messages.join(" ")}
        </li>
      ))}
    </ul>
  );
}
