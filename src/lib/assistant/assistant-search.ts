// TRANSPORT: client-query — reads GET /store/search, GET /feed/search and GET /research-programs
// through their existing wrappers. Public reads only.
//
// THE ASSISTANT'S ONE TOOL: A SEARCH THE VIEWER COULD HAVE TYPED.
//
// Neither model can call tools — Chrome's on-device model has no function calling at all — so a
// "tool call" here is a structured field: the reply carries `search: { scope, query }`, and the
// panel runs it through the same public wrapper the search pages use. The backend still does the
// searching (AGENTS.md: search over big data is server work); the assistant only chooses the words.
// The search is shown as what it is, "Searched the store for …", so nobody mistakes three links for
// the model's own knowledge.

import type { AssistantSearchScope } from "@/lib/assistant/assistant-reply.schemas";
import { searchVideos } from "@/lib/feed/api";
import type { ActionResponse } from "@/lib/http";
import { listResearchPrograms } from "@/lib/rnd/research-programs.api";
import { searchStore } from "@/lib/store/catalog.api";

export interface AssistantSearchResult {
  readonly label: string;
  readonly href: string;
}

const ASSISTANT_SEARCH_RESULT_LIMIT = 3;

export const ASSISTANT_SEARCH_SCOPE_LABELS: Record<AssistantSearchScope, string> = {
  store: "the store",
  videos: "videos",
  research_programs: "research programmes",
};

export async function runAssistantSearch(
  scope: AssistantSearchScope,
  query: string,
): Promise<ActionResponse<readonly AssistantSearchResult[]>> {
  switch (scope) {
    case "store": {
      const storeResult = await searchStore({
        query,
        documentKind: "product",
        limit: ASSISTANT_SEARCH_RESULT_LIMIT,
      });
      if (!storeResult.success) return storeResult;
      return {
        success: true,
        data: storeResult.data.items.map((storeHit) => ({
          label: storeHit.title,
          href: `/store/product/${encodeURIComponent(storeHit.publicSlug)}`,
        })),
      };
    }
    case "videos": {
      const videoResult = await searchVideos({ query, limit: ASSISTANT_SEARCH_RESULT_LIMIT });
      if (!videoResult.success) return videoResult;
      return {
        success: true,
        data: videoResult.data.data.map((video) => ({
          label: video.title,
          href: `/watch?v=${encodeURIComponent(video.videoId)}`,
        })),
      };
    }
    case "research_programs": {
      const programResult = await listResearchPrograms({
        q: query,
        limit: ASSISTANT_SEARCH_RESULT_LIMIT,
      });
      if (!programResult.success) return programResult;
      return {
        success: true,
        data: programResult.data.rows.map((program) => ({
          label: program.title,
          href: `/research-and-development/programs/${encodeURIComponent(program.slug)}`,
        })),
      };
    }
    default: {
      const exhaustiveCheck: never = scope;
      return exhaustiveCheck;
    }
  }
}
