// TRANSPORT: props-only — presentational server component. Fetches nothing and, since it
// stopped pretending to send an invite, holds no state either.
import Link from "next/link";

/**
 * The link off a talent card.
 *
 * IT NO LONGER SAYS "INVITE TO PROJECT", and the reason is structural rather than
 * cosmetic. `POST /research-projects/:slug/invites` needs a PROJECT and usually a ROLE,
 * and this card is rendered on a cross-project directory where the viewer has picked
 * neither. The old control flipped `useState` to "Invite sent ✓" and sent nothing, which
 * told someone they had recruited a person they had not contacted.
 *
 * So the card links to the profile — a real destination the read supports — and inviting
 * happens inside a project, where the slug and the open roles are already resolved.
 */
export default function InviteTalentButton({ handleOrUserId }: { handleOrUserId: string }) {
  return (
    <Link
      href={`/research-and-development/talent/${handleOrUserId}`}
      className="mt-auto cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-center text-sm font-medium text-[#00696E]"
    >
      View profile
    </Link>
  );
}
