import { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookie = request.headers.get("cookie") || "";

  // Stream the SSE from backend to the browser
  const backendUrl = `${BACKEND}/api/campaigns/${id}/run`;

  const backendRes = await fetch(backendUrl, {
    headers: { cookie },
  });

  // Pass through the SSE stream directly
  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
