"use client";

import Image from "next/image";
import type { AccountDetailRow, AccountEditor } from "./your-account-rows";

function AccountDetailRowBody({ row }: { readonly row: AccountDetailRow }) {
  return (
    <>
      <Image src={row.icon} alt="" width={24} height={24} className="size-6 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="text-sm font-medium text-secondary-foreground">{row.label}</span>
        <span className="truncate text-xs text-muted-foreground">{row.value}</span>
      </span>
      {row.kind !== "copy" && row.badge ? (
        <span className="flex shrink-0 flex-row items-center gap-1 text-xs font-medium text-primary-imprint">
          <Image
            src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={16}
            height={16}
          />
          {row.badge}
        </span>
      ) : null}
    </>
  );
}

export function AccountDetailRowItem({
  row,
  isCopied,
  onOpenEditor,
  onCopyAccountId,
}: {
  readonly row: AccountDetailRow;
  readonly isCopied: boolean;
  readonly onOpenEditor: (editor: AccountEditor) => void;
  readonly onCopyAccountId: (row: AccountDetailRow) => void;
}) {
  if (row.kind === "editor") {
    return (
      <button
        type="button"
        onClick={() => onOpenEditor(row.editor)}
        className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 text-left transition-colors hover:bg-muted"
      >
        <AccountDetailRowBody row={row} />
        <Image
          src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
      </button>
    );
  }

  if (row.kind === "copy") {
    return (
      <div className="flex w-full flex-row items-center gap-4 p-4">
        <AccountDetailRowBody row={row} />
        <button
          type="button"
          onClick={() => onCopyAccountId(row)}
          aria-label={`Copy ${row.label}`}
          className="flex shrink-0 cursor-pointer flex-row items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/content_copy_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={16}
            height={16}
          />
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-row items-center gap-4 p-4">
      <AccountDetailRowBody row={row} />
    </div>
  );
}
