// TRANSPORT: props-only — one shared constant. No network, no browser API.

/**
 * The id `(home)/layout.tsx` puts on its `<main>`, which is the group's scroll container, and which
 * `main-scroll-reset.tsx` looks up to put it back to the top on navigation.
 *
 * ⚠️ **IT LIVES IN A MODULE WITH NO DIRECTIVE, AND THAT IS THE POINT.** It used to be exported from
 * `main-scroll-reset.tsx`, a `"use client"` module, and imported from there by the SERVER layout —
 * where a client module's export is a client reference, not the string. It rendered correctly only
 * because it went straight into a prop; the first server-side use would have broken silently, the
 * way `DEFAULT_PROBLEM_CLUSTER_SORT` did. `pnpm check:client-boundary` now refuses that shape.
 */
export const HOME_SCROLL_CONTAINER_ID = "home-scroll-container";
