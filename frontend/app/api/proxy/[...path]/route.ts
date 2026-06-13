import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

function forwardCookies(request: NextRequest): HeadersInit {
  return {
    "Content-Type": "application/json",
    cookie: request.headers.get("cookie") || "",
  };
}

// Generic proxy helper
async function proxyGet(request: NextRequest, path: string) {
  const url = new URL(request.url);
  const backendUrl = `${BACKEND}${path}${url.search}`;
  try {
    const res = await fetch(backendUrl, {
      headers: { cookie: request.headers.get("cookie") || "" },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}

async function proxyPost(request: NextRequest, path: string) {
  let body: BodyInit | undefined;
  let contentType = request.headers.get("content-type") || "application/json";

  if (contentType.includes("multipart/form-data")) {
    body = await request.formData();
    // Don't set content-type — browser will set boundary
    const res = await fetch(`${BACKEND}${path}`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") || "" },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } else {
    body = await request.text();
    const res = await fetch(`${BACKEND}${path}`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") || "", "Content-Type": "application/json" },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }
}

// GET /api/proxy/data/stats
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyGet(request, `/api/${path.join("/")}`);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyPost(request, `/api/${path.join("/")}`);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const backendUrl = `${BACKEND}/api/${path.join("/")}`;
  try {
    const res = await fetch(backendUrl, {
      method: "DELETE",
      headers: { cookie: request.headers.get("cookie") || "" },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
