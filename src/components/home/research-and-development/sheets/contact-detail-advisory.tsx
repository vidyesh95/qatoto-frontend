// TRANSPORT: props-only — derives its copy from the field text it is given. No network.

import {
  detectContactDetailKinds,
  formatContactDetailAdvisory,
} from "@/lib/rnd/contact-detail-screen";

type ContactDetailAdvisoryProps = {
  /** Referenced by the field's `aria-describedby`. */
  id: string;
  /** The field's current value. */
  text: string;
};

/**
 * The warning under a problem report's Title or Description when the text looks like it holds a
 * phone number or an email address. Advisory only — see `contact-detail-screen.ts`.
 *
 * ALWAYS RENDERED, EMPTY WHEN THERE IS NOTHING TO SAY. A live region that mounts at the same moment
 * as its content is not reliably announced, so the region exists from the start and only its text
 * changes. Render it BESIDE the field's <label>, never inside it, or its text joins the field's
 * accessible name.
 */
export default function ContactDetailAdvisory({ id, text }: ContactDetailAdvisoryProps) {
  const advisoryText = formatContactDetailAdvisory(detectContactDetailKinds(text));
  return (
    // `<output>` is a polite `status` live region by default — the `sign-in.tsx` precedent.
    <output id={id} className="block text-xs text-warning">
      {advisoryText}
    </output>
  );
}
