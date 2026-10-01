"use client";

import Image from "next/image";
import { useState } from "react";

import { COUNTRY_OPTIONS, type Country } from "@/lib/countries";

export type { Country };

type LocationPanelProps = {
  /** Currently selected country code (ISO 3166-1 alpha-2). */
  selected: string;
  /** Called with the chosen country code. */
  onSelect: (code: string) => void;
  /** Invoked by the header back button. */
  onBack: () => void;
};

/**
 * Presentational "Browse location" panel: header, subtitle, a search filter,
 * and the selectable list of countries. The chosen country scopes
 * recommendations and store listings only — not delivery or account region.
 */
export function LocationPanel({ selected, onSelect, onBack }: LocationPanelProps) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCountries = normalizedQuery
    ? COUNTRY_OPTIONS.filter(
        (country) =>
          country.name.toLowerCase().includes(normalizedQuery) ||
          country.code.toLowerCase().includes(normalizedQuery),
      )
    : COUNTRY_OPTIONS;

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-border bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Browse location</h2>
      </header>
      <p className="px-4 py-4 text-sm text-muted-foreground">
        See videos, products, and reviews popular in another country. This changes your
        recommendations only — not your delivery address or the region your account is registered
        in.
      </p>
      <div className="px-4 pb-3">
        <input
          type="search"
          value={query}
          onChange={(changeEvent) => setQuery(changeEvent.target.value)}
          placeholder="Search countries"
          aria-label="Search countries"
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-secondary-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>
      <ul>
        {visibleCountries.map((country) => {
          const isSelected = selected === country.code;
          return (
            <li key={country.code}>
              <button
                type="button"
                onClick={() => onSelect(country.code)}
                className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
              >
                <span className="size-6 shrink-0">
                  {isSelected && (
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Selected location"
                      width={24}
                      height={24}
                    />
                  )}
                </span>
                <span className="text-sm font-medium text-secondary-foreground">
                  {country.name}
                  {isSelected && <span className="sr-only"> (selected)</span>}
                </span>
              </button>
            </li>
          );
        })}
        {visibleCountries.length === 0 && (
          <li className="px-4 py-4 text-sm text-muted-foreground">No countries found</li>
        )}
      </ul>
    </div>
  );
}
