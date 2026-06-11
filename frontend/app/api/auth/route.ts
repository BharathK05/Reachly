import { NextRequest, NextResponse } from "next/server";

// POST /api/auth — login
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { username, password } = body;

  const validUser = process.env.AUTH_USER || "admin";
  const validPass = process.env.AUTH_PASS || "reachly123";

  if (username === validUser && password === validPass) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("reachly_auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  }

  return NextResponse.json(
    { success: false, message: "Invalid username or password." },
    { status: 401 }
  );
}

// DELETE /api/auth — logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("reachly_auth", "", { maxAge: 0, path: "/" });
  return response;
}
