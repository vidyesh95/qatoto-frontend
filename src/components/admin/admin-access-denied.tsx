import Link from "next/link";

// Display-only denial panel (UI phase). No redirect — the real gate is
// server-side role enforcement on every /admin/* request, added later.
export default function AdminAccessDenied() {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-border py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Staff access required</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This area is for Qatoto moderators and admins. If you believe you should have access,
        contact a platform admin.
      </p>
      <Link
        href="/"
        className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
      >
        Back to Qatoto
      </Link>
    </div>
  );
}
