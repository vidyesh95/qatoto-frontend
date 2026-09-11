/**
 * Up to two initials from a person's name, for the circle that stands in for a photo.
 *
 * FIRST LETTER OF THE FIRST TWO WORDS, upper-cased: "Amara Okonkwo" → "AO", "Priya" → "P". The same
 * rule `storefront-stakeholders.tsx` applies inline. An empty or whitespace-only name returns "",
 * and the caller renders an empty circle rather than a placeholder letter that looks like somebody.
 */
export function buildInitialsFromName(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter((namePart) => namePart !== "")
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join("");
}
