// TRANSPORT: props-only — a heading rule. Fetches nothing.

interface SectionDividerProps {
  title: string;
}

export default function SectionDivider({ title }: SectionDividerProps) {
  return (
    <div className="flex flex-row items-center">
      <hr className="mx-4 hidden flex-1 border-t border-border md:flex lg:mx-6" />
      <h2 className="mx-auto text-2xl font-medium tracking-wider whitespace-nowrap text-muted-foreground">
        {title}
      </h2>
      <hr className="mx-4 hidden flex-1 border-t border-border md:flex lg:mx-6" />
    </div>
  );
}
