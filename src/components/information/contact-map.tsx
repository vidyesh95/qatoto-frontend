import Image from "next/image";

export interface ContactMapProps {
  readonly mapShortlink: string;
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Head office map card linking directly to external Google Maps navigation.
 *
 * ⚠️ ZERO THIRD-PARTY REQUESTS AND ZERO CLIENT JS.
 * Rather than embedding a third-party iframe or loading external scripts, this component
 * renders an optimized, high-resolution static map preview of Borivali West.
 *
 * Clicking anywhere on the card opens Google Maps in a new tab.
 */
export default function ContactMap({ mapShortlink, latitude, longitude }: ContactMapProps) {
  return (
    <a
      href={mapShortlink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open Qatoto head office on Google Maps in a new tab"
      className="group relative flex h-full min-h-96 w-full flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:border-foreground/30 hover:shadow-md sm:min-h-105"
    >
      <Image
        src="/images/contact/head-office-map.webp"
        alt="Map of Borivali West showing Qatoto Head Office at Carter Road No. 1"
        fill
        sizes="(min-width: 1024px) 520px, (min-width: 768px) 50vw, 100vw"
        priority
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/90 via-background/25 to-background/20 transition-opacity duration-300 group-hover:opacity-80"
      />

      <div className="relative z-10 flex items-center justify-between p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/90 px-3.5 py-1 text-xs font-medium text-foreground backdrop-blur">
          <span className="size-2 rounded-full bg-primary" />
          Borivali, Mumbai
        </span>
        <span className="rounded-full border border-border/80 bg-background/90 px-3 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
          {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
        </span>
      </div>

      <div className="relative z-10 m-4 flex items-center justify-between rounded-2xl border border-border/80 bg-background/90 px-4 py-3 shadow-sm backdrop-blur transition group-hover:bg-background sm:m-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={18}
            height={18}
          />
          <span className="text-xs font-semibold tracking-tight text-foreground">
            66 Avenue, Borivali
          </span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground group-hover:text-primary">
          Open in Maps
          <span aria-hidden>↗</span>
        </span>
      </div>
    </a>
  );
}
