"use client";

import Image from "next/image";
import { ApiRequestError, type ApiError } from "@/lib/http";
import {
  buildPrivacyRequestMailtoHref,
  PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL,
} from "@/lib/privacy-request";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";
import type { UseQueryResult } from "@tanstack/react-query";
import type { useRequestDataExportMutation } from "@/hooks/account/data-export";

export type DataExportView =
  | { readonly status: "checking" }
  | { readonly status: "unreadable"; readonly error: ApiError }
  | { readonly status: "idle" }
  | { readonly status: "requesting" }
  | { readonly status: "building" }
  | { readonly status: "ready"; readonly downloadUrl: string }
  | { readonly status: "link-expired" }
  | { readonly status: "archive-expired" }
  | { readonly status: "failed"; readonly error: ApiError };

function DownloadIcon() {
  return (
    <Image
      src="/icons/download_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
      alt=""
      width={16}
      height={16}
    />
  );
}

export function DataExportActionControl({
  isSessionReady,
  accountId,
  accountHandle,
  dataExportQuery,
  dataExportMutation,
}: {
  readonly isSessionReady: boolean;
  readonly accountId: string;
  readonly accountHandle: string;
  readonly dataExportQuery: UseQueryResult<
    | {
        readonly success: true;
        readonly data: {
          readonly state: "pending" | "running" | "ready" | "expired" | "failed";
          readonly downloadUrl: string | null;
        } | null;
      }
    | { readonly success: false; readonly error: ApiError }
  >;
  readonly dataExportMutation: ReturnType<typeof useRequestDataExportMutation>;
}) {
  function readDataExportView(): DataExportView {
    if (dataExportMutation.isPending) return { status: "requesting" };

    const result = dataExportQuery.data;
    if (result === undefined) return { status: "checking" };
    if (!result.success) return { status: "unreadable", error: result.error };

    if (result.data === null) {
      if (dataExportMutation.isError) {
        return {
          status: "failed",
          error:
            dataExportMutation.error instanceof ApiRequestError
              ? dataExportMutation.error.apiError
              : { code: "NETWORK", message: "We could not reach the server. Please try again." },
        };
      }
      return { status: "idle" };
    }

    switch (result.data.state) {
      case "pending":
      case "running":
        return { status: "building" };
      case "ready":
        return result.data.downloadUrl === null
          ? { status: "link-expired" }
          : { status: "ready", downloadUrl: result.data.downloadUrl };
      case "expired":
        return { status: "archive-expired" };
      case "failed":
        return {
          status: "failed",
          error: { code: "EXPORT_FAILED", message: "We could not build your file." },
        };
      default: {
        const exhaustiveCheck: never = result.data.state;
        return exhaustiveCheck;
      }
    }
  }

  function handleRequestExport() {
    dataExportMutation.reset();
    dataExportMutation.mutate();
  }

  if (!isSessionReady) {
    return (
      <button
        type="button"
        disabled
        className="flex cursor-not-allowed flex-row items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground opacity-50"
      >
        <DownloadIcon />
        Checking your account…
      </button>
    );
  }

  const view = readDataExportView();

  switch (view.status) {
    case "checking":
      return (
        <button
          type="button"
          disabled
          className="flex cursor-not-allowed flex-row items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground opacity-50"
        >
          <DownloadIcon />
          Checking…
        </button>
      );

    case "unreadable":
      return (
        <div className="flex flex-col gap-2">
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <span>We could not check on your download. {view.error.message}</span>
            <span className="text-xs opacity-70">Code {view.error.code}</span>
          </div>
          <button
            type="button"
            onClick={() => void dataExportQuery.refetch()}
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      );

    case "archive-expired":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Your last download has expired — we keep each file for seven days. You can ask for a
            fresh one.
          </p>
          <button
            type="button"
            onClick={handleRequestExport}
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <DownloadIcon />
            Download your data
          </button>
        </div>
      );

    case "idle":
      return (
        <button
          type="button"
          onClick={handleRequestExport}
          className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
        >
          <DownloadIcon />
          Download your data
        </button>
      );

    case "requesting":
    case "building":
      return (
        <output className="block self-start rounded-2xl border border-primary-imprint/30 bg-primary-imprint/5 p-3 text-sm text-primary-imprint">
          We are building your file. This can take a few minutes — you can close this panel and come
          back.
        </output>
      );

    case "ready":
      return (
        <div className="flex flex-col gap-2">
          <a
            href={view.downloadUrl}
            download
            rel="noopener"
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint transition-colors hover:bg-primary-imprint/5"
          >
            <DownloadIcon />
            Download your data
          </a>
          <button
            type="button"
            onClick={handleRequestExport}
            className="cursor-pointer self-start text-sm font-medium text-secondary-foreground underline"
          >
            Build a fresh copy
          </button>
        </div>
      );

    case "link-expired":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            That download link expired. Links last five minutes; your file is kept for seven days.
          </p>
          <button
            type="button"
            onClick={() => void dataExportQuery.refetch()}
            className="flex cursor-pointer flex-row items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
          >
            <DownloadIcon />
            Get a fresh link
          </button>
        </div>
      );

    case "failed":
      return (
        <div className="flex flex-col gap-2">
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <span>{view.error.message}</span>
            <span className="text-xs opacity-70">Code {view.error.code}</span>
          </div>
          <a
            href={buildPrivacyRequestMailtoHref({
              kind: "data-export",
              accountId,
              accountHandle,
              note: `The in-app download failed with code ${view.error.code}.`,
            })}
            className="self-start text-sm font-medium text-primary-imprint underline"
          >
            Ask {PRIVACY_CONTACT_EMAIL} for it instead — we answer within{" "}
            {PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL}
          </a>
          <button
            type="button"
            onClick={handleRequestExport}
            className="cursor-pointer self-start text-sm font-medium text-secondary-foreground underline"
          >
            Try building it again
          </button>
        </div>
      );

    default: {
      const exhaustiveCheck: never = view;
      return exhaustiveCheck;
    }
  }
}
