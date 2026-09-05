// TRANSPORT: props-only — the tags arrive from whichever detail page rendered them.

/** Tag pills. An empty list renders nothing rather than an empty row. */
export default function BlueprintTagList({ tags }: { readonly tags: readonly string[] }) {
  if (tags.length === 0) return null;

  return (
    <ul className="mt-5 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-[#6F7979]">
          {tag}
        </li>
      ))}
    </ul>
  );
}
