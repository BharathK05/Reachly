"use client";
import { use } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Loader2, AlertCircle, ArrowLeft,
  Zap, Users, DollarSign, Radio, TrendingUp, Download, RefreshCw,
  CheckCircle2,
} from "lucide-react";
import type { InsightsResponse } from "@/lib/types";

const PROXY = "/api/proxy";

// ── Proper Markdown → HTML renderer ──────────────────────────────────────────
function renderMarkdown(md: string): string {
  if (!md) return "";
  const lines = md.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^### (.+)/.test(line)) { output.push(`<h3 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:18px 0 8px;font-family:'Plus Jakarta Sans',sans-serif">${applyInline(line.replace(/^### /, ""))}</h3>`); i++; continue; }
    if (/^## (.+)/.test(line))  { output.push(`<h2 style="font-size:17px;font-weight:800;color:var(--text-primary);margin:22px 0 10px;font-family:'Plus Jakarta Sans',sans-serif;padding-bottom:6px;border-bottom:1px solid var(--border)">${applyInline(line.replace(/^## /, ""))}</h2>`);  i++; continue; }
    if (/^# (.+)/.test(line))   { output.push(`<h1 style="font-size:20px;font-weight:800;color:var(--text-primary);margin:0 0 16px;font-family:'Plus Jakarta Sans',sans-serif">${applyInline(line.replace(/^# /, ""))}</h1>`);   i++; continue; }

    // Tables
    if (/^\|.+\|/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) { tableLines.push(lines[i]); i++; }
      let html = '<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;font-size:12.5px;">';
      tableLines.forEach((tl, ti) => {
        if (/^\|[-:| ]+\|/.test(tl)) return;
        const cells = tl.split("|").slice(1, -1).map((c) => c.trim());
        const tag = ti === 0 ? "th" : "td";
        const style = tag === "th"
          ? "padding:8px 12px;text-align:left;background:var(--bg-card-hover);color:var(--text-muted);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid var(--border);"
          : "padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-primary);";
        html += `<tr>${cells.map((c) => `<${tag} style="${style}">${applyInline(c)}</${tag}>`).join("")}</tr>`;
      });
      html += "</table></div>";
      output.push(html);
      continue;
    }

    // Bullet lists
    if (/^[-*] (.+)/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] (.+)/.test(lines[i])) {
        items.push(`<li style="margin-bottom:5px;color:var(--text-secondary);line-height:1.65">${applyInline(lines[i].replace(/^[-*] /, ""))}</li>`);
        i++;
      }
      output.push(`<ul style="padding-left:20px;margin:8px 0">${items.join("")}</ul>`);
      continue;
    }

    // Numbered lists
    if (/^\d+\. (.+)/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. (.+)/.test(lines[i])) {
        items.push(`<li style="margin-bottom:5px;color:var(--text-secondary);line-height:1.65">${applyInline(lines[i].replace(/^\d+\. /, ""))}</li>`);
        i++;
      }
      output.push(`<ol style="padding-left:20px;margin:8px 0">${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") { output.push("<div style='height:8px'></div>"); i++; continue; }
    output.push(`<p style="margin:0 0 8px;color:var(--text-secondary);line-height:1.7;font-size:13.5px">${applyInline(line)}</p>`);
    i++;
  }
  return output.join("\n");
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong style='color:var(--text-primary);font-weight:700'>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em style='color:var(--text-secondary)'>$1</em>")
    .replace(/`(.+?)`/g, "<code style='background:var(--bg-card-hover);padding:2px 6px;border-radius:4px;font-size:12px;color:var(--accent-green)'>$1</code>");
}

// ── Snapshot Row ──────────────────────────────────────────────────────────────
function SnapRow({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  const isGoal = label === "Goal";
  return (
    <div style={{ display:"flex", flexDirection: isGoal ? "column" : "row", justifyContent:"space-between", alignItems: isGoal ? "flex-start" : "center", gap: isGoal ? 6 : 0, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, color:"var(--text-secondary)", fontSize:12.5 }}>{icon} {label}</div>
      <span style={{ fontWeight:700, color: accent || "var(--text-primary)", fontSize:13, lineHeight: isGoal ? 1.4 : undefined }}>{value}</span>
    </div>
  );
}

const PRINT_STYLE = `@media print {
  html, body { background: white !important; color: black !important; height: auto !important; overflow: visible !important; }
  .app-layout { height: auto !important; overflow: visible !important; display: block !important; }
  .main-content { overflow: visible !important; height: auto !important; padding: 0 !important; }
  .no-print { display: none !important; }
  h1,h2,h3 { color: #111 !important; }
  p,li,td,th { color: #333 !important; }
}`;

export default function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: campaignId } = use(params);

  const [data, setData]       = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);   // true while checking cache
  const [generating, setGenerating] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  // ── On mount, check for cached insights ──────────────────────────────────
  useEffect(() => {
    fetch(`${PROXY}/campaigns/${campaignId}/insights`)
      .then((r) => r.json())
      .then((res) => {
        if (res.cached && res.insights) {
          setData(res);
          setFromCache(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${PROXY}/campaigns/${campaignId}/insights`, { method:"POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to generate insights");
      }
      const json = await res.json();
      setData(json);
      setFromCache(false);
    } catch (e: any) {
      setError(e.message || "Failed to generate insights.");
    } finally {
      setGenerating(false);
    }
  };

  const snap = data?.campaign_snapshot;
  const pct  = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />
      <div className="page-content-wide">
        {/* Header */}
        <div className="page-header no-print">
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <button onClick={() => router.back()} className="btn btn-secondary btn-sm" id="insights-back-btn"><ArrowLeft size={14} /></button>
            <BarChart3 size={20} color="var(--accent-amber)" />
            <h1 className="page-title" style={{ fontSize:"1.5rem" }}>Campaign Insights</h1>
            {fromCache && (
              <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--accent-green)", background:"var(--accent-green-dim)", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>
                <CheckCircle2 size={11} /> Cached
              </span>
            )}
          </div>
          <p className="page-subtitle">
            AI-generated analysis
          </p>
        </div>

        <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
          {/* ── Main Insights Panel ── */}
          <div style={{ flex:1, minWidth:0 }}>
            {loading && (
              <div className="card" style={{ textAlign:"center", padding:"48px 32px" }}>
                <Loader2 size={28} color="var(--accent-violet)" className="animate-spin" style={{ margin:"0 auto 12px", display:"block" }} />
                <p style={{ color:"var(--text-secondary)", fontSize:13 }}>Loading…</p>
              </div>
            )}

            {!loading && !data && !generating && (
              <div className="card no-print" style={{ textAlign:"center", padding:"48px 32px", background:"linear-gradient(160deg, var(--bg-card), var(--accent-amber-dim))", borderColor:"rgba(245,166,35,0.2)" }}>
                <div style={{ width:64, height:64, borderRadius:16, background:"var(--accent-amber-dim)", border:"2px solid rgba(245,166,35,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                  <BarChart3 size={28} color="var(--accent-amber)" />
                </div>
                <h2 style={{ marginBottom:10, fontSize:"1.2rem" }}>Ready to Analyze</h2>
                <p style={{ color:"var(--text-secondary)", marginBottom:28, maxWidth:400, margin:"0 auto 28px", lineHeight:1.6, fontSize:13.5 }}>
                  Generate an AI-powered analysis with predicted vs actual metrics and actionable recommendations.
                </p>
                <button id="generate-insights-btn" className="btn btn-primary btn-lg" onClick={handleGenerate}>
                  <Zap size={16} /> Generate Insights
                </button>
              </div>
            )}

            {generating && (
              <div className="card" style={{ textAlign:"center", padding:"48px 32px" }}>
                <Loader2 size={36} color="var(--accent-violet)" style={{ margin:"0 auto 16px", display:"block", animation:"spin 1s linear infinite" }} />
                <h3 style={{ marginBottom:8 }}>Analyzing Campaign…</h3>
                <p style={{ color:"var(--text-secondary)", fontSize:13 }}>AI is reviewing your campaign data. This takes ~10 seconds.</p>
              </div>
            )}

            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"14px 18px", background:"var(--accent-rose-dim)", borderRadius:"var(--radius)", color:"var(--accent-rose)", fontSize:13, marginBottom:16 }}>
                <AlertCircle size={16} /> {error}
                <button className="btn btn-secondary btn-sm" onClick={handleGenerate} style={{ marginLeft:"auto" }}>Retry</button>
              </div>
            )}

            {data && !generating && (
              <>
                <div className="card" style={{ animation:"fadeIn 0.4s ease", marginBottom: 20 }}>
                  {/* Toolbar */}
                  <div className="no-print" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, paddingBottom:14, borderBottom:"1px solid var(--border)" }}>
                    <div>
                      <h2 style={{ fontSize:"1rem", marginBottom:2 }}>AI Analysis Report</h2>
                      {fromCache && <p style={{ fontSize:11.5, color:"var(--text-muted)" }}>Previously generated — regenerate for latest delivery data</p>}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={handleGenerate} id="regenerate-insights-btn">
                        <RefreshCw size={12} /> {fromCache ? "Regenerate" : "Regenerate"}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => window.print()} id="download-pdf-btn">
                        <Download size={12} /> Download PDF
                      </button>
                    </div>
                  </div>

                  {/* Rendered markdown */}
                  <div style={{ fontSize:13.5, lineHeight:1.7 }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(data.insights || "") }}
                  />
                </div>

                {/* Next Campaign Recommendation Card */}
                {data.next_campaign_recommendation && (
                  <div 
                    className="card no-print"
                    style={{
                      animation: "fadeIn 0.5s ease",
                      background: "linear-gradient(135deg, var(--bg-card), var(--accent-violet-dim))",
                      borderColor: "rgba(124,92,252,0.25)",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-violet)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Zap size={14} color="white" />
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>What to do next? AI Strategy Recommendation</h3>
                    </div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--text-primary)", fontWeight: 500 }}>
                      {data.next_campaign_recommendation}
                    </p>
                    <div style={{ marginTop: 16 }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => router.push(`/studio?goal=${encodeURIComponent(data.next_campaign_recommendation || "")}`)}
                        style={{ textShadow: "none" }}
                      >
                        Create Campaign Studio Draft
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Snapshot Sidebar ── */}
          <div style={{ width:280, flexShrink:0 }} className="no-print">
            <div className="card" style={{ position:"sticky", top:0 }}>
              <h3 style={{ marginBottom:14, fontSize:13.5, fontWeight:700 }}>Campaign Snapshot</h3>

              {snap ? (
                <>
                  <SnapRow label="Goal"      value={snap.goal} icon={<Zap size={13} />} />
                  <SnapRow label="Channel"   value={snap.channel}                     icon={<Radio size={13} />} />
                  <SnapRow label="Audience"  value={`${snap.audience_size} people`}   icon={<Users size={13} />} />
                  <SnapRow label="Budget"    value={`₹${Number(snap.budget).toLocaleString()}`} icon={<DollarSign size={13} />} />
                  <SnapRow label="Est. Cost" value={`₹${snap.estimated_cost}`}        icon={<TrendingUp size={13} />} />

                  {snap.predictions && (
                    <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)" }}>
                      <div style={{ fontSize:10.5, fontWeight:700, color:"var(--text-muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Predicted</div>
                      <SnapRow label="Open Rate"  value={pct(snap.predictions.open_rate)}       icon={<BarChart3 size={13} />} accent="var(--accent-blue)" />
                      <SnapRow label="CTR"        value={pct(snap.predictions.ctr)}             icon={<BarChart3 size={13} />} accent="var(--accent-violet)" />
                      <SnapRow label="Conversion" value={pct(snap.predictions.conversion_rate)} icon={<BarChart3 size={13} />} accent="var(--accent-green)" />
                    </div>
                  )}

                  {snap.actual && (
                    <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)" }}>
                      <div style={{ fontSize:10.5, fontWeight:700, color:"var(--text-muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Actual Delivery</div>
                      {Object.entries(snap.actual).map(([key, val]) => (
                        val > 0 ? (
                          <div key={key} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
                            <span style={{ fontSize:12.5, color:"var(--text-secondary)", textTransform:"capitalize" }}>{key}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)" }}>{val}</span>
                          </div>
                        ) : null
                      ))}
                      {Object.values(snap.actual).every((v) => v === 0) && (
                        <p style={{ fontSize:12, color:"var(--text-muted)" }}>No delivery data yet.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state" style={{ padding:"20px 0" }}>
                  <BarChart3 size={24} color="var(--text-muted)" />
                  <span style={{ fontSize:12.5 }}>Generate insights to see snapshot</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
