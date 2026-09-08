// TRANSPORT: props-only — pure data. No I/O, no React.
//
// The viewer's four modes. Outside the engine chunk so the tab bar can render — and the page can
// prerender its labels — without pulling the renderer into the route's initial JavaScript.
//
// "COMPONENTS", NOT "ELECTRONICS". The reference names this tab for the one product it sells, which
// happens to have a circuit board. A catalogue of teardowns has pump housings and gearboxes in it,
// and a tab that promises electronics over a casting is worse than a duller name.

export const TEARDOWN_VIEWER_TABS = ["design", "exploded", "components", "specifications"] as const;
export type TeardownViewerTab = (typeof TEARDOWN_VIEWER_TABS)[number];

export const TEARDOWN_VIEWER_TAB_LABELS: Record<TeardownViewerTab, string> = {
  design: "Design",
  exploded: "Exploded view",
  components: "Components",
  specifications: "Specifications",
};

export const DEFAULT_TEARDOWN_VIEWER_TAB: TeardownViewerTab = "design";
