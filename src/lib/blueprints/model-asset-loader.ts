/**
 * Downloads binary model assets (.glb) with abort signal support.
 * Returns `null` on any failure, including an abort.
 */
export async function downloadModelBytes(
  url: string,
  signal: AbortSignal,
): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url, { signal });
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}
