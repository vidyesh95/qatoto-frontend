import Image from "next/image";

export interface AccountEmailDisplayProps {
  readonly email: string;
  readonly helperText: string;
  readonly errorMessage?: string | null;
}

export function AccountEmailDisplay({ email, helperText, errorMessage }: AccountEmailDisplayProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-secondary-foreground">Email address</span>
      <div className="flex flex-row items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3">
        <Image
          src="/icons/mail_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          alt=""
          width={20}
          height={20}
        />
        <span className="text-base text-secondary-foreground">{email || "…"}</span>
      </div>
      <span className="text-xs text-muted-foreground">{helperText}</span>
      {errorMessage ? <span className="text-xs text-destructive">{errorMessage}</span> : null}
    </div>
  );
}
