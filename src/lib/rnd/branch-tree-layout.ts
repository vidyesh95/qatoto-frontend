import type { ResearchBranch } from "@/lib/rnd/research-programs.schemas";

// TRANSPORT: props-only — a pure layout function. No fetching, no React, no DOM.
//
// Lays out the §10 research branch tree.
//
// WHY THIS EXISTS AT ALL. The mock this replaces shipped hand-authored coordinates:
// `canvasPosition: { leftPercent: 36, topPercent: 16 }` on each of eleven nodes, tuned for one
// 720px SVG canvas. Backend §10 rules that out in as many words — "the client should run a tidy
// tree layout" — for the same reason §6 rules it out for the problem map's `mapPosition`:
// authored coordinates are layout masquerading as data. They break at any other viewport, they
// cannot accommodate a twelfth node, and on a surface where ANY signed-in user may add a branch
// there is nobody to re-tune them.
//
// So the wire carries `parentBranchId` + `siblingOrder`, and this module turns that into
// coordinates at render time.
//
// THE ALGORITHM: a tidy layered tree, Reingold–Tilford in its simple form.
//
//   1. Depth sets the primary axis. Every node at depth d shares one column (or row).
//   2. Leaves are placed in order along the secondary axis, one slot each.
//   3. A parent is CENTRED over its children. Bottom-up, so a parent sees final child
//      positions.
//
// That is enough for this shape. The full Reingold–Tilford contour-threading machinery exists to
// pack sibling SUBTREES tightly without overlap, which matters for wide sparse trees; a research
// taxonomy of 12–38 nodes and 8 levels does not need it, and the simple version is a page of
// code a reader can check rather than several hundred lines they cannot.
//
// EVERYTHING IS INTEGER PER-MILLE, not float percent. Two reasons: it matches the wire format of
// the curator override (`pinnedLeftPermille`), so a pinned node and a computed one are the same
// units; and integer arithmetic renders identically on every platform, where a float would put a
// node a sub-pixel apart between server and client and produce a hydration mismatch.

/** One laid-out node. Per-mille of the canvas, so the caller owns the pixel dimensions. */
export interface BranchLayoutNode {
  readonly branchId: string;
  readonly leftPermille: number;
  readonly topPermille: number;
  readonly depth: number;
  /** True when a curator pinned this node and the computed position was discarded. */
  readonly isPinned: boolean;
}

/** One parent→child connector, for the caller to draw. */
export interface BranchLayoutEdge {
  readonly fromBranchId: string;
  readonly toBranchId: string;
  readonly fromLeftPermille: number;
  readonly fromTopPermille: number;
  readonly toLeftPermille: number;
  readonly toTopPermille: number;
}

export interface BranchTreeLayout {
  readonly nodes: readonly BranchLayoutNode[];
  readonly edges: readonly BranchLayoutEdge[];
  /** How many levels deep the tree runs. Lets the caller size the canvas to the content. */
  readonly depthCount: number;
  /** How many leaf slots wide. Same purpose on the other axis. */
  readonly slotCount: number;
}

export type BranchTreeOrientation = "horizontal" | "vertical";

export interface BranchTreeLayoutOptions {
  /**
   * `horizontal` runs depth left→right, which suits a wide desktop canvas and reads as
   * "the question, then its sub-questions". `vertical` runs depth top→bottom for a narrow
   * viewport. The caller picks per breakpoint; the maths is the same with the axes swapped.
   */
  readonly orientation?: BranchTreeOrientation;
  /**
   * Inset from each edge, in per-mille, so a node's rendered box is not clipped by the canvas
   * boundary. The default leaves room for a ~144px node on a ~720px canvas.
   */
  readonly marginPermille?: number;
}

/**
 * `siblingOrder` first, then `branchId` — ending on a unique key so two siblings sharing an order
 * never swap places between renders. The same §4c rule 4 the backend applies to its own ordering,
 * applied here for the same reason: a graph that reshuffles on refresh reads as a bug.
 */
function bySiblingOrder(left: ResearchBranch, right: ResearchBranch): number {
  return left.siblingOrder - right.siblingOrder || left.branchId.localeCompare(right.branchId);
}

const DEFAULT_MARGIN_PERMILLE = 100;
const PERMILLE_MAX = 1000;

/**
 * Lays out a flat branch list.
 *
 * Accepts the rows exactly as `listProgramBranches` returns them — already depth-first ordered,
 * but this does not rely on that: it rebuilds the parent→children index itself, so a caller that
 * filters or re-sorts the list still gets a correct layout.
 *
 * FORESTS ARE SUPPORTED. A program may have several roots (`parentBranchId === null`), and a
 * re-parent can create one at any time, so treating "one root" as an invariant would break the
 * page the first time somebody moved a branch.
 *
 * ORPHANS ARE TREATED AS ROOTS. If a row references a parent that is not in the list — which
 * happens when a caller filters the tree, or when the 500-node read cap truncates it — the node
 * is laid out as a root rather than dropped. A node the API returned and the page does not draw
 * is worse than one drawn in the wrong place.
 */
export function layOutBranchTree(
  branches: readonly ResearchBranch[],
  options: BranchTreeLayoutOptions = {},
): BranchTreeLayout {
  const orientation = options.orientation ?? "horizontal";
  const marginPermille = options.marginPermille ?? DEFAULT_MARGIN_PERMILLE;

  if (branches.length === 0) {
    return { nodes: [], edges: [], depthCount: 0, slotCount: 0 };
  }

  const branchById = new Map(branches.map((branch) => [branch.branchId, branch]));

  const childrenByParent = new Map<string, ResearchBranch[]>();
  const roots: ResearchBranch[] = [];

  for (const branch of branches) {
    // Narrowed on the VALUE, not on a boolean: `parentBranchId` is `string | null`, and a
    // `hasResolvableParent` flag would not carry the narrowing — which is how the first version of
    // this loop ended up with an `as string` that CLAUDE.md's Pattern 2 forbids outright.
    //
    // ORPHANS BECOME ROOTS. A row whose parent is absent from the list — because the caller
    // filtered the tree, or because the 500-node read cap truncated it — is laid out as a root
    // rather than dropped. A node the API returned and the page does not draw is worse than one
    // drawn in the wrong place.
    const parentBranchId = branch.parentBranchId;
    if (parentBranchId === null || !branchById.has(parentBranchId)) {
      roots.push(branch);
      continue;
    }
    const siblings = childrenByParent.get(parentBranchId);
    if (siblings) siblings.push(branch);
    else childrenByParent.set(parentBranchId, [branch]);
  }

  roots.sort(bySiblingOrder);
  for (const siblings of childrenByParent.values()) siblings.sort(bySiblingOrder);

  /**
   * Assign slots depth-first: each leaf takes the next slot, each parent centres over its
   * children.
   *
   * ITERATIVE, NOT RECURSIVE. The depth cap is 8, so recursion would be safe — but a tree
   * arriving from a network response is untrusted shape, and a cycle (which a backend bug could
   * produce despite the cycle check) would blow the stack rather than terminate. The `visited`
   * set makes that a bounded no-op instead.
   */
  const slotByBranchId = new Map<string, number>();
  const depthByBranchId = new Map<string, number>();
  const visited = new Set<string>();
  let nextLeafSlot = 0;

  for (const root of roots) {
    // Explicit stack of (node, depth, phase). `phase: "enter"` pushes children; `"exit"` assigns
    // the slot, which is what makes the pass bottom-up for parents.
    const stack: { branch: ResearchBranch; depth: number; phase: "enter" | "exit" }[] = [
      { branch: root, depth: 0, phase: "enter" },
    ];

    while (stack.length > 0) {
      const frame = stack.pop();
      if (!frame) break;

      const { branch, depth, phase } = frame;

      if (phase === "enter") {
        if (visited.has(branch.branchId)) continue;
        visited.add(branch.branchId);
        depthByBranchId.set(branch.branchId, depth);

        const children = (childrenByParent.get(branch.branchId) ?? []).filter(
          (child) => !visited.has(child.branchId),
        );

        stack.push({ branch, depth, phase: "exit" });
        // Reversed, so the first child is popped first and slots run left→right.
        for (let index = children.length - 1; index >= 0; index -= 1) {
          const child = children[index];
          if (child) stack.push({ branch: child, depth: depth + 1, phase: "enter" });
        }
        continue;
      }

      const children = childrenByParent.get(branch.branchId) ?? [];
      const placedChildSlots = children
        .map((child) => slotByBranchId.get(child.branchId))
        .filter((slot): slot is number => slot !== undefined);

      if (placedChildSlots.length === 0) {
        // A leaf. Takes the next slot along the secondary axis.
        slotByBranchId.set(branch.branchId, nextLeafSlot);
        nextLeafSlot += 1;
        continue;
      }

      // Centred over its children. Doubled and halved in integers so the midpoint of an even
      // child count lands on a half-slot without floating-point drift.
      const firstSlot = Math.min(...placedChildSlots);
      const lastSlot = Math.max(...placedChildSlots);
      slotByBranchId.set(branch.branchId, (firstSlot + lastSlot) / 2);
    }
  }

  const depthCount = Math.max(0, ...depthByBranchId.values()) + 1;
  const slotCount = Math.max(nextLeafSlot, 1);

  /** Maps a 0-based index within `count` slots onto the inset per-mille span. */
  const toPermille = (index: number, count: number): number => {
    const usableSpan = PERMILLE_MAX - marginPermille * 2;
    if (count <= 1) return Math.round(PERMILLE_MAX / 2);
    return Math.round(marginPermille + (usableSpan * index) / (count - 1));
  };

  const nodes: BranchLayoutNode[] = branches.map((branch) => {
    const depth = depthByBranchId.get(branch.branchId) ?? 0;
    const slot = slotByBranchId.get(branch.branchId) ?? 0;

    const depthPermille = toPermille(depth, depthCount);
    const slotPermille = toPermille(slot, slotCount);

    const computedLeft = orientation === "horizontal" ? depthPermille : slotPermille;
    const computedTop = orientation === "horizontal" ? slotPermille : depthPermille;

    // THE CURATOR OVERRIDE WINS. Both values are set or neither is — the backend's CHECK
    // guarantees it — but the two are narrowed together in locals rather than behind an
    // `isPinned` boolean, because TypeScript cannot carry a narrowing through a boolean and a
    // non-null assertion here would be exactly the `as` this codebase forbids.
    const { pinnedLeftPermille, pinnedTopPermille } = branch;

    if (pinnedLeftPermille !== null && pinnedTopPermille !== null) {
      return {
        branchId: branch.branchId,
        leftPermille: pinnedLeftPermille,
        topPermille: pinnedTopPermille,
        depth,
        isPinned: true,
      };
    }

    return {
      branchId: branch.branchId,
      leftPermille: computedLeft,
      topPermille: computedTop,
      depth,
      isPinned: false,
    };
  });

  const positionByBranchId = new Map(nodes.map((node) => [node.branchId, node]));

  const edges: BranchLayoutEdge[] = branches.flatMap((branch) => {
    if (branch.parentBranchId === null) return [];
    const parent = positionByBranchId.get(branch.parentBranchId);
    const child = positionByBranchId.get(branch.branchId);
    // An orphan was laid out as a root, so it has no edge to draw.
    if (!parent || !child) return [];

    return [
      {
        fromBranchId: parent.branchId,
        toBranchId: child.branchId,
        fromLeftPermille: parent.leftPermille,
        fromTopPermille: parent.topPermille,
        toLeftPermille: child.leftPermille,
        toTopPermille: child.topPermille,
      },
    ];
  });

  return { nodes, edges, depthCount, slotCount };
}

/**
 * Converts per-mille to a CSS percentage string.
 *
 * One decimal place, which is the most a per-mille value can carry — and formatting it here
 * rather than at each call site keeps every node's `style` identical between the server render
 * and the client hydration.
 */
export function permilleToPercent(permille: number): string {
  return `${(permille / 10).toFixed(1)}%`;
}
