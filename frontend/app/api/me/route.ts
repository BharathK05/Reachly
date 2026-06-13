import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch(`${BACKEND}/api/auth/me`, {
      headers: { cookie },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Connection error" }, { status: 503 });
  }
}
