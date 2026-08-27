// TRANSPORT: server-fetch — server-only. Imports `next/headers` through `callerRequestOptions`, so
// a `"use client"` file importing this fails to build. That build error is the guard.
//
// WHY THIS FILE EXISTS, and it is one specific hole rather than a general wrapper. The channel route
// reads `GET /channels/:handle` TWICE in a render pass: once in `generateMetadata` for the title,
// once in the page for the header. Next's fetch memoization would normally collapse that — it is
// what `/store/product/[id]` relies on — but this read goes out `cache: "no-store"`, because the
// profile carries `viewerState.isSubscribedToCreator` and a cached response would serve one
// visitor's subscription state to the next. `no-store` fetches are not memoized, so without this the
// title would cost a genuine second round trip on the most-linked public page on the site.
//
// React's `cache()` closes it at the right layer: per RENDER PASS rather than per URL, keyed on the
// handle alone, holding a per-visitor response for exactly as long as one visitor's render. It is
// not a cross-request cache and must not become one.

import { cache } from "react";

import { getChannel } from "@/lib/channels/api";
import { callerRequestOptions } from "@/lib/server-http";

/**
 * `GET /channels/:handle` as the current visitor, once per render pass.
 *
 * KEYED ON THE HANDLE ONLY. `callerRequestOptions()` builds a fresh object each call, so passing it
 * as an argument would make every call a cache miss on object identity — the cookie read happens
 * INSIDE, deliberately, and that is what makes the key stable.
 */
export const loadChannelProfileOnce = cache(async (handle: string) => {
  return getChannel(handle, await callerRequestOptions());
});
