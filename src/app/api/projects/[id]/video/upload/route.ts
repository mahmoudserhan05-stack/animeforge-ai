import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError } from "@/lib/api-utils";

/**
 * Issues a short-lived client upload token so the browser can stream the
 * assembled video straight to Vercel Blob — a serverless function can't
 * receive a 10-20MB body (4.5MB request cap), so it never passes through here.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);
    await getOwnedProjectOrThrow(params.id, userId);

    const body = (await req.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`projects/${params.id}/`)) {
          throw new Error("pathname outside project");
        }
        return {
          allowedContentTypes: ["video/webm", "video/mp4"],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      // DB is finalised by the follow-up PUT /video call, not here — the
      // onUploadCompleted callback can't reach localhost during dev.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (err) {
    return handleRouteError(err);
  }
}
