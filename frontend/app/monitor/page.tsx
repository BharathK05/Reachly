"use client";
import { useRouter } from "next/navigation";
import { Radio, ArrowRight } from "lucide-react";

export default function MonitorIndexPage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="page-header">
        <h1 className="page-title">Live Monitor</h1>
        <p className="page-subtitle">No campaign selected. Launch one from Campaign Studio.</p>
      </div>
      <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
        <Radio size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>Approve and launch a campaign to see live delivery stats.</p>
        <button className="btn btn-primary" onClick={() => router.push("/studio")} id="monitor-go-studio-btn">
          Create Campaign <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
