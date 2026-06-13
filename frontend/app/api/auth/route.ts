import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

// POST /api/auth — login (proxies to backend)
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  try {
    const res = await fetch(`${BACKEND}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: data.detail || "Invalid email or password." },
        { status: res.status }
      );
    }

    // Forward the Set-Cookie header from backend to the browser
    const response = NextResponse.json({ success: true, company_name: data.company_name });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Connection error." }, { status: 503 });
  }
}

// DELETE /api/auth — logout
export async function DELETE(request: NextRequest) {
  try {
    const res = await fetch(`${BACKEND}/api/auth/logout`, {
      method: "DELETE",
      headers: { cookie: request.headers.get("cookie") || "" },
    });
    const response = NextResponse.json({ success: true });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch {
    return NextResponse.json({ success: false }, { status: 503 });
  }
}
