import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Basic validation
  if (!body.company_name?.trim()) {
    return NextResponse.json({ success: false, message: "Company name is required." }, { status: 400 });
  }
  if (!body.email?.trim()) {
    return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 });
  }
  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ success: false, message: "Password must be at least 6 characters." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: body.company_name.trim(),
        email: body.email.trim().toLowerCase(),
        password: body.password,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: data.detail || "Registration failed." },
        { status: res.status }
      );
    }

    const response = NextResponse.json({ success: true, company_name: data.company_name });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Connection error." }, { status: 503 });
  }
}
