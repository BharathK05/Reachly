"use client";
import { use } from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Zap,
  Users,
  DollarSign,
  Radio,
  TrendingUp,
} from "lucide-react";
import { generateInsights } from "@/lib/api";
import type { InsightsResponse } from "@/lib/types";

function SnapshotRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 13 }}>
        {icon}
        {label}
      </div>
      <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13.5 }}>{value}</span>
    </div>
  );
}

// Simple markdown to HTML renderer
function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[^]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])(.+)$/gm, "<p>$1</p>");
}

export default function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: campaignId } = use(params);

  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateInsights(campaignId);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate insights.");
    } finally {
      setLoading(false);
    }
  };

  const snap = data?.campaign_snapshot;
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <button
            onClick={() => router.back()}
            className="btn btn-secondary btn-sm"
            aria-label="Go back"
            id="insights-back-btn"
          >
            <ArrowLeft size={14} />
          </button>
          <BarChart3 size={20} color="var(--accent-amber)" />
          <h1 className="page-title" style={{ fontSize: "1.5rem" }}>Campaign Insights</h1>
        </div>
        <p className="page-subtitle">
          AI-generated analysis of your campaign results ·{" "}
          <code style={{ fontSize: 12, color: "var(--text-muted)" }}>{campaignId}</code>
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Main Insights Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!data && !loading && (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "48px 32px",
                background: "linear-gradient(160deg, var(--bg-card), var(--accent-amber-dim))",
                borderColor: "rgba(245,166,35,0.2)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "var(--accent-amber-dim)",
                  border: "2px solid rgba(245,166,35,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <BarChart3 size={28} color="var(--accent-amber)" />
              </div>
              <h2 style={{ color: "var(--text-primary)", marginBottom: 10, fontSize: "1.2rem" }}>
                Ready to Analyze
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: 28, maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.6 }}>
                Generate a comprehensive AI-powered analysis of your campaign performance, including predicted vs actual metrics and actionable recommendations.
              </p>
              <button
                id="generate-insights-btn"
                className="btn btn-primary btn-lg"
                onClick={handleGenerate}
                disabled={loading}
              >
                <Zap size={18} />
                Generate Insights
              </button>
            </div>
          )}

          {loading && (
            <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
              <Loader2 size={36} color="var(--accent-violet)" style={{ margin: "0 auto 16px", display: "block", animation: "spin 1s linear infinite" }} />
              <h3 style={{ color: "var(--text-primary)", marginBottom: 8 }}>Analyzing Campaign…</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Gemini is reviewing your campaign data and generating insights.
              </p>
            </div>
          )}

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", background: "var(--accent-rose-dim)", borderRadius: "var(--radius)", color: "var(--accent-rose)", fontSize: 13 }}>
              <AlertCircle size={16} />
              {error}
              <button className="btn btn-secondary btn-sm" onClick={handleGenerate} style={{ marginLeft: "auto" }}>Retry</button>
            </div>
          )}

          {data && (
            <div
              className="card markdown"
              style={{ animation: "fadeIn 0.4s ease forwards" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>
                  AI Analysis Report
                </h2>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerate}
                  id="regenerate-insights-btn"
                >
                  <Zap size={13} />
                  Regenerate
                </button>
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(data.insights),
                }}
              />
            </div>
          )}
        </div>

        {/* Sidebar Snapshot */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div className="card" style={{ position: "sticky", top: 0 }}>
            <h3 style={{ marginBottom: 16, fontSize: 14, color: "var(--text-primary)" }}>
              Campaign Snapshot
            </h3>

            {snap ? (
              <>
                <SnapshotRow label="Goal" value={snap.goal.length > 30 ? snap.goal.slice(0, 30) + "…" : snap.goal} icon={<Zap size={14} />} />
                <SnapshotRow label="Channel" value={snap.channel} icon={<Radio size={14} />} />
                <SnapshotRow label="Audience" value={String(snap.audience_size)} icon={<Users size={14} />} />
                <SnapshotRow label="Budget" value={`₹${snap.budget.toLocaleString()}`} icon={<DollarSign size={14} />} />
                <SnapshotRow label="Est. Cost" value={`₹${snap.estimated_cost}`} icon={<TrendingUp size={14} />} />

                {snap.predictions && (
                  <>
                    <div style={{ marginTop: 20 }}>
                      <div className="label" style={{ marginBottom: 12 }}>Predicted Metrics</div>
                      {[
                        { label: "Open Rate", value: pct(snap.predictions.open_rate), color: "var(--accent-blue)" },
                        { label: "CTR", value: pct(snap.predictions.ctr), color: "var(--accent-violet)" },
                        { label: "Conversion", value: pct(snap.predictions.conversion_rate), color: "var(--accent-green)" },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <div className="label" style={{ marginBottom: 12 }}>Actual Delivery</div>
                      {Object.entries(snap.actual).map(([key, val]) => (
                        <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 12.5, color: "var(--text-secondary)", textTransform: "capitalize" }}>{key}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <BarChart3 size={24} color="var(--text-muted)" />
                <span>Generate insights to see campaign snapshot</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
