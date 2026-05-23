interface SectionDividerProps {
  title: string;
}

export default function SectionDivider({ title }: SectionDividerProps) {
  return (
    <div className="flex flex-row items-center">
      <hr className="flex-1 border-t border-[#A9ACAC] mx-6" />
      <h2 className="text-[#5C5F5F] text-2xl font-medium tracking-wider whitespace-nowrap">
        {title}
      </h2>
      <hr className="flex-1 border-t border-[#A9ACAC] mx-6" />
    </div>
  );
}
