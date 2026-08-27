"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/documents.api`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listTradeDocuments, uploadTradeDocument } from "@/lib/store/documents.api";
import { unwrap } from "@/lib/http";

export const tradeDocumentKeys = {
  all: ["trade-documents"] as const,
  list: () => ["trade-documents", "list"] as const,
};

/**
 * The caller's own attachments — only ones that have finished scanning.
 *
 * `retry: false` — a 403 from the workspace guard is an answer, not a flake.
 */
export function useTradeDocumentsQuery(isEnabled = true) {
  return useQuery({
    queryKey: tradeDocumentKeys.list(),
    queryFn: async () => unwrap(await listTradeDocuments({ limit: 50 })),
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * `POST /commerce/documents`.
 *
 * ⚠️ IT INVALIDATES THE LIST AND THE LIST WILL NOT CONTAIN THE NEW DOCUMENT YET. The upload answers
 * **202** — the file is stored, `pending_scan`, and the list returns only `available` documents. So
 * the refetch is how the row eventually appears once the scan clears it, not how it appears now.
 * The caller must say "uploaded, being checked" rather than showing it as ready; attaching an id
 * this returns would be refused, which is precisely why the backend answers 202 instead of 201.
 */
export function useUploadTradeDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentFile: File) => unwrap(await uploadTradeDocument(documentFile)),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tradeDocumentKeys.list() });
    },
  });
}
