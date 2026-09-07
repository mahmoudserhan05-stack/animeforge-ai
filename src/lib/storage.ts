import { put } from "@vercel/blob";

/**
 * Provider result URLs (e.g. Kie.ai's tempfile CDN) are short-lived — they 404
 * after a couple of weeks. Download the file once and re-host it on Vercel Blob
 * so stored project assets keep working.
 *
 * No-ops (returns the source URL) when BLOB_READ_WRITE_TOKEN isn't set, so local
 * dev without a Blob store still works.
 */
export async function persistRemoteFile(sourceUrl: string, key: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return sourceUrl;

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const ext = sourceUrl.split("?")[0].split(".").pop()?.slice(0, 5) || "bin";

    const blob = await put(`${key}.${ext}`, await res.arrayBuffer(), {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  } catch (err) {
    // Don't fail the whole generation over re-hosting — fall back to the
    // provider URL (it works now, just won't last).
    console.error("persistRemoteFile failed, using source URL:", err);
    return sourceUrl;
  }
}
