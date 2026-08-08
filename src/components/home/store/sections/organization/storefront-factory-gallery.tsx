// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// Company photos, grouped by what each one is OF. `mediaKind` exists on the wire for
// exactly this — a buyer scanning for "do they actually own a production line" is served
// by headed groups and not by one undifferentiated grid.
//
// `altText` is used verbatim when the seller supplied it. Falling back to the kind label
// keeps the images announced rather than silent.

import Image from "next/image";

import type { OrganizationMedia, OrganizationMediaKind } from "@/lib/store/organizations.schemas";
import { MEDIA_KIND_LABELS, ORGANIZATION_MEDIA_KINDS } from "@/lib/store/organizations.schemas";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";

type MediaGroup = { mediaKind: OrganizationMediaKind; photos: OrganizationMedia[] };

function groupByMediaKind(media: OrganizationMedia[]): MediaGroup[] {
  const orderedMedia = media.toSorted((first, second) => first.position - second.position);
  return ORGANIZATION_MEDIA_KINDS.map((mediaKind) => ({
    mediaKind,
    photos: orderedMedia.filter((photo) => photo.mediaKind === mediaKind),
  })).filter((group) => group.photos.length > 0);
}

export default function StorefrontFactoryGallery({ media }: { media: OrganizationMedia[] }) {
  const groups = groupByMediaKind(media);
  if (groups.length === 0) return null;

  return (
    <StorefrontSection
      title="Factory photos"
      attribution="declared"
      description="Uploaded by the seller. Qatoto does not photograph these sites."
    >
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.mediaKind}>
            <p className="mb-1.5 text-sm leading-5 font-medium text-[#191C1C]">
              {MEDIA_KIND_LABELS[group.mediaKind]}
            </p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {group.photos.map((photo) => (
                <figure key={photo.id} className="flex flex-col gap-1">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                    <Image
                      src={photo.imageUrl}
                      fill
                      sizes="(min-width: 1024px) 264px, 45vw"
                      alt={photo.altText ?? MEDIA_KIND_LABELS[photo.mediaKind]}
                      className="object-cover"
                    />
                  </div>
                  {photo.altText && (
                    <figcaption className="text-[11px] leading-4 text-[#6F7979]">
                      {photo.altText}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StorefrontSection>
  );
}
