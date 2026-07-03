import Image from "next/image";
import Link from "next/link";

// Landing view of the Creator Studio: an upload dropzone card and a "Go Live
// Stream" alternative. Presentational only — no file handling wired up yet.
export default function CreateStudioPage() {
  return (
    <div className="p-6">
      {/* Upload dropzone */}
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border py-24">
        <span className="flex size-32 items-center justify-center rounded-full bg-secondary">
          <Image
            src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt=""
            width={48}
            height={48}
          />
        </span>
        <p className="text-lg font-medium text-foreground">Drag and drop video files to upload</p>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Select files
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        By uploading and submitting your videos to Qatoto, you acknowledge that you agree to
        Qatoto&apos;s <TermsLink>Terms of Service</TermsLink> and{" "}
        <TermsLink>Community Guidelines.</TermsLink>
        <br />
        Please make sure that you do not violate others{" "}
        <TermsLink>copyright or privacy rights.</TermsLink>
      </p>

      {/* OR divider */}
      <div className="my-8 flex items-center gap-4">
        <hr className="flex-1 border-border" />
        <span className="text-lg font-medium text-foreground">OR</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* Go live */}
      <div className="flex justify-center">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/stream_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Go Live Stream
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        By streaming and submitting your videos to Qatoto, you acknowledge that you agree to
        Qatoto&apos;s <TermsLink>Terms of Service</TermsLink> and{" "}
        <TermsLink>Community Guidelines.</TermsLink>
        <br />
        Please make sure that you do not violate others{" "}
        <TermsLink>copyright or privacy rights.</TermsLink>
      </p>

      {/* OR divider */}
      <div className="my-8 flex items-center gap-4">
        <hr className="flex-1 border-border" />
        <span className="text-lg font-medium text-foreground">OR</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* Create store listing */}
      <div className="flex justify-center">
        <Link
          href="/studio/products"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Create Store Listing
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        List your product on the Qatoto Store to reach buyers, partners, and B2B customers.
      </p>
    </div>
  );
}

// Inline teal accent link used across the acknowledgement copy.
function TermsLink({ children }: { children: React.ReactNode }) {
  return <span className="cursor-pointer text-[#1DBDC5] hover:underline">{children}</span>;
}
