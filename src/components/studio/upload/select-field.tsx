"use client";

import Image from "next/image";

export interface SelectFieldProps {
  readonly fieldId: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onValueChange: (value: string) => void;
}

export function SelectField({ fieldId, label, value, options, onValueChange }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary-imprint"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Image
          src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={20}
          height={20}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        />
      </div>
    </div>
  );
}
