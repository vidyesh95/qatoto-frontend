"use client";

import { useEffect } from "react";

import Image from "next/image";

// Full company details bottom sheet for the product page (UI-only phase, no
// fetch). Shows the supplier's profile — founding, location, factory photos,
// freight access, visit policy, ownership, and business type. Static copy for
// now — the verified company profile comes from the backend later; the client
// only renders it. Bottom sheet on mobile, centered modal on desktop — mirrors
// TradeProtectionSheet.

type FactSpec = {
  iconFileName: string;
  label: string;
  value: string;
};

type FactoryPhoto = {
  src: string;
  caption: string;
};

type FreightAccess = {
  iconFileName: string;
  label: string;
  detail: string;
  isAvailable: boolean;
};

type Stakeholder = {
  iconFileName: string;
  role: string;
  name: string;
};

const OVERVIEW_FACTS: FactSpec[] = [
  {
    iconFileName: "description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    label: "Founded",
    value: "2008 · 17 years in business",
  },
  {
    iconFileName: "location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    label: "Location",
    value: "Foshan, Guangdong, China",
  },
  {
    iconFileName: "science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    label: "Business type",
    value: "OEM manufacturer with in-house R&D — not an agency",
  },
];

const FACTORY_PHOTOS: FactoryPhoto[] = [
  { src: "/dummy/commercial_furniture.avif", caption: "Factory exterior" },
  { src: "/dummy/furniture.avif", caption: "Production floor" },
  { src: "/dummy/home_furniture.avif", caption: "Warehouse" },
  { src: "/dummy/office_chair.avif", caption: "QC line" },
];

const FREIGHT_ACCESS: FreightAccess[] = [
  {
    iconFileName: "local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    label: "Road freight",
    detail: "Container trucks can dock on site — 2 loading bays",
    isAvailable: true,
  },
  {
    iconFileName: "directions_boat_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    label: "Sea freight",
    detail: "38 km from Nansha Port",
    isAvailable: true,
  },
  {
    iconFileName: "flight_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    label: "Air freight",
    detail: "55 km from Guangzhou Baiyun Airport",
    isAvailable: true,
  },
  {
    iconFileName: "train_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    label: "Rail freight",
    detail: "Not available at this site",
    isAvailable: false,
  },
];

const STAKEHOLDERS: Stakeholder[] = [
  {
    iconFileName: "group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    role: "Shareholders",
    name: "Puda Holdings (60%), Chen Family Trust (40%)",
  },
  {
    iconFileName: "group_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
    role: "Director",
    name: "Mr. Wei Chen — Managing Director",
  },
];

export default function CompanyDetailsSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close company details"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Company details"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Company details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <p className="shrink-0 px-4 pb-2 text-base font-medium text-[#191C1C]">
          Guangdong Puda Electrical Appliance Co., Ltd
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          {/* Overview */}
          <ul className="flex flex-col gap-3">
            {OVERVIEW_FACTS.map((fact) => (
              <li key={fact.label} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D6E3FF]">
                  <Image src={`/icons/${fact.iconFileName}`} width={20} height={20} alt="" />
                </span>
                <div className="flex-1">
                  <p className="text-xs text-[#6F7979]">{fact.label}</p>
                  <p className="text-sm text-[#191C1C]">{fact.value}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Factory photos */}
          <p className="mt-5 mb-2 text-sm font-medium text-[#191C1C]">Factory photos</p>
          <div className="grid grid-cols-2 gap-2">
            {FACTORY_PHOTOS.map((photo) => (
              <div key={photo.caption} className="flex flex-col gap-1">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                  <Image
                    src={photo.src}
                    fill
                    sizes="(min-width: 640px) 220px, 45vw"
                    alt={photo.caption}
                    className="object-cover"
                  />
                </div>
                <span className="text-[11px] text-[#6F7979]">{photo.caption}</span>
              </div>
            ))}
          </div>

          {/* Freight access */}
          <p className="mt-5 mb-2 text-sm font-medium text-[#191C1C]">Freight &amp; logistics</p>
          <ul className="flex flex-col gap-2">
            {FREIGHT_ACCESS.map((freight) => (
              <li
                key={freight.label}
                className="flex items-center gap-3 rounded-lg bg-[#F2F4F4] px-3 py-2"
              >
                <Image
                  src={`/icons/${freight.iconFileName}`}
                  width={22}
                  height={22}
                  alt=""
                  className={freight.isAvailable ? "" : "opacity-40"}
                />
                <div className="flex-1">
                  <p className="text-sm text-[#191C1C]">{freight.label}</p>
                  <p className="text-xs text-[#6F7979]">{freight.detail}</p>
                </div>
                <Image
                  src={
                    freight.isAvailable
                      ? "/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
                      : "/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  }
                  width={18}
                  height={18}
                  alt={freight.isAvailable ? "Available" : "Not available"}
                  className={freight.isAvailable ? "" : "opacity-40"}
                />
              </li>
            ))}
          </ul>

          {/* Factory visit */}
          <p className="mt-5 mb-2 text-sm font-medium text-[#191C1C]">Factory visit</p>
          <div className="flex gap-3 rounded-lg bg-[#F2F4F4] px-3 py-2">
            <Image
              src="/icons/factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={22}
              height={22}
              alt=""
            />
            <p className="flex-1 text-xs leading-5 text-[#191C1C]">
              Buyers are welcome on site. Visits run Monday to Saturday, 9:00 AM – 5:00 PM (CST).
              Book at least 3 working days ahead so a host and translator can be arranged.
            </p>
          </div>

          {/* Ownership */}
          <p className="mt-5 mb-2 text-sm font-medium text-[#191C1C]">Ownership</p>
          <ul className="flex flex-col gap-3">
            {STAKEHOLDERS.map((stakeholder) => (
              <li key={stakeholder.role} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D6E3FF]">
                  <Image src={`/icons/${stakeholder.iconFileName}`} width={20} height={20} alt="" />
                </span>
                <div className="flex-1">
                  <p className="text-xs text-[#6F7979]">{stakeholder.role}</p>
                  <p className="text-sm text-[#191C1C]">{stakeholder.name}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
