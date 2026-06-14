import { NextResponse } from 'next/server';

export async function GET() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (res.ok) {
      return NextResponse.json({ ok: true, status: "pinged backend" });
    }
    return NextResponse.json({ ok: false, status: "backend unhealthy" }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ ok: false, status: "backend unreachable" }, { status: 500 });
  }
}
