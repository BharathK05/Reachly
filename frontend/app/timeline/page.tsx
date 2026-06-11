"use client";
import { useRouter } from "next/navigation";
import { GitBranch, ArrowRight } from "lucide-react";

export default function TimelineIndexPage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="page-header">
        <h1 className="page-title">Agent Timeline</h1>
        <p className="page-subtitle">No campaign selected. Create one in the Campaign Studio.</p>
      </div>
      <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
        <GitBranch size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>Start a campaign to view the AI agent timeline.</p>
        <button className="btn btn-primary" onClick={() => router.push("/studio")} id="go-to-studio-btn">
          Go to Campaign Studio <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
