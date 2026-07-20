// Nodes and edges share one 0–100 coordinate space: the svg viewBox is stretched
// to fill the canvas (preserveAspectRatio="none"), and node left/top are the same
// percentages, so an edge endpoint lands exactly on its node's center.
export const buildBranchEdgePath = (
  parentLeftPercent: number,
  parentTopPercent: number,
  childLeftPercent: number,
  childTopPercent: number,
) => {
  const horizontalControlOffset = (childLeftPercent - parentLeftPercent) / 2;
  const firstControlX = parentLeftPercent + horizontalControlOffset;
  const secondControlX = childLeftPercent - horizontalControlOffset;
  return `M ${parentLeftPercent} ${parentTopPercent} C ${firstControlX} ${parentTopPercent}, ${secondControlX} ${childTopPercent}, ${childLeftPercent} ${childTopPercent}`;
};
