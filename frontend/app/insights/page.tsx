"use client";
import { useRouter } from "next/navigation";
import { BarChart3, ArrowRight } from "lucide-react";

export default function InsightsIndexPage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="page-header">
        <h1 className="page-title">Campaign Insights</h1>
        <p className="page-subtitle">No campaign selected. Launch one to see insights.</p>
      </div>
      <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
        <BarChart3 size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>Launch a campaign and monitor its results before generating insights.</p>
        <button className="btn btn-primary" onClick={() => router.push("/studio")} id="insights-go-studio-btn">
          Create Campaign <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
