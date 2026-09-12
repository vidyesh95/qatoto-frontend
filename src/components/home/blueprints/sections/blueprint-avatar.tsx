// TRANSPORT: props-only — the person arrives from whichever page rendered them.

import Image from "next/image";

import { buildInitialsFromName } from "@/lib/format-initials";

/**
 * The circle beside a name: a photo when there is one, initials when there is not.
 *
 * ONE COMPONENT RATHER THAN A BRANCH AT EACH CALL SITE. `avatarUrl` became nullable when these
 * pages started reading real accounts — `user.image` is nullable and nothing fills it — and there
 * are five places that render a person. A guard written at one entry point leaks through the other
 * four; a component cannot be called without it.
 *
 * An empty name yields no initials and an empty circle, rather than a placeholder letter that looks
 * like somebody.
 */
export default function BlueprintAvatar({
  displayName,
  avatarUrl,
  sizePx,
  className,
}: {
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly sizePx: number;
  readonly className?: string;
}) {
  const sizeClassName = className ?? "";

  if (avatarUrl !== null) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={sizePx}
        height={sizePx}
        className={`rounded-full object-cover ${sizeClassName}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: sizePx, height: sizePx }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#E3EAEA] text-[#4A5656] ${sizeClassName}`}
    >
      <span style={{ fontSize: Math.max(9, Math.round(sizePx * 0.4)) }} className="font-medium">
        {buildInitialsFromName(displayName)}
      </span>
    </span>
  );
}
