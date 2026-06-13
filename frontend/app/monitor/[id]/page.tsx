"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Radio, Send, PackageCheck, MailOpen, MousePointerClick,
  XCircle, Clock, BarChart3, ArrowLeft, TrendingUp,
  ShoppingCart, BookOpen, AlertCircle, RefreshCw,
} from "lucide-react";
import { fetchMonitor, approveCampaign } from "@/lib/api";
import type { MonitorResponse, CommunicationLog } from "@/lib/types";
import { useState } from "react";

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  clicked:   { label:"Clicked",   color:"var(--accent-green)",  icon:<MousePointerClick size={13} /> },
  converted: { label:"Converted", color:"#22c55e",              icon:<ShoppingCart size={13} /> },
  opened:    { label:"Opened",    color:"var(--accent-blue)",   icon:<MailOpen size={13} /> },
  read:      { label:"Read",      color:"#60a5fa",              icon:<BookOpen size={13} /> },
  delivered: { label:"Delivered", color:"var(--accent-violet)", icon:<PackageCheck size={13} /> },
  sent:      { label:"Sent",      color:"var(--accent-amber)",  icon:<Send size={13} /> },
  failed:    { label:"Failed",    color:"var(--accent-rose)",   icon:<XCircle size={13} /> },
  pending:   { label:"Pending",   color:"var(--text-muted)",    icon:<Clock size={13} /> },
};

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, total, color, icon }: {
  label: string; value: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="stat-card" style={{ "--accent-color": color } as React.CSSProperties}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", background:"var(--bg-base)", padding:"2px 8px", borderRadius:99, border:"1px solid var(--border)" }}>
          {pct}%
        </span>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value.toLocaleString()}</div>
      <div className="progress-bar" style={{ marginTop:10 }}>
        <div className="progress-fill" style={{ width:`${pct}%`, transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ── Horizontal animated bar ───────────────────────────────────────────────────
function DeliveryBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:9, height:9, borderRadius:"50%", background:color, flexShrink:0 }} />
          <span style={{ fontSize:13, color:"var(--text-secondary)", fontWeight:500 }}>{label}</span>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <span style={{ fontSize:13.5, color, fontWeight:700 }}>{count.toLocaleString()}</span>
          <span style={{ fontSize:12, color:"var(--text-muted)", minWidth:40, textAlign:"right" }}>{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div style={{ height:8, background:"var(--border)", borderRadius:99, overflow:"hidden" }}>
        <div style={{
          height:"100%", borderRadius:99,
          background: color,
          width:`${pct}%`,
          transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

export default function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: campaignId } = use(params);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);

  const { data, error, mutate } = useSWR<MonitorResponse>(
    `monitor-${campaignId}`,
    () => fetchMonitor(campaignId),
    { refreshInterval: 3000 }
  );

  const summary = data?.summary || {};
  const logs: CommunicationLog[] = data?.logs || [];

  const sent      = summary.sent      || 0;
  const delivered = summary.delivered || 0;
  const read      = summary.read      || 0;
  const opened    = summary.opened    || 0;
  const clicked   = summary.clicked   || 0;
  const converted = summary.converted || 0;
  const failed    = summary.failed    || 0;
  const pending   = summary.pending   || 0;
  const total     = sent + pending;

  // All still pending = dispatch may not have reached channel service
  const allPending = logs.length > 0 && sent === 0 && delivered === 0;

  const handleRetryDispatch = async () => {
    setRetrying(true);
    setRetryMsg(null);
    try {
      const result = await approveCampaign(campaignId);
      if ((result as any).channel_service_ok === false) {
        setRetryMsg(`Channel service error: ${(result as any).channel_error}. Is it running on port 8001?`);
      } else {
        setRetryMsg("Re-dispatched! Events should start appearing in ~5 seconds.");
        mutate();
      }
    } catch (e: any) {
      setRetryMsg(e.message || "Retry failed.");
    } finally {
      setRetrying(false);
    }
  };

  const sortedLogs = [...logs].reverse();

  return (
    <div className="page-content-wide">
      {/* Header */}
      <div className="page-header">
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <button onClick={() => router.back()} className="btn btn-secondary btn-sm" id="monitor-back-btn"><ArrowLeft size={14} /></button>
          <Radio size={20} color="var(--accent-green)" />
          <h1 className="page-title" style={{ fontSize:"1.5rem" }}>Live Monitor</h1>
          <span className="badge badge-green" style={{ animation:"pulse-ring 2s infinite" }}>Live</span>
        </div>
        <p className="page-subtitle">
          Real-time delivery tracking · refreshes every 3s ·{" "}
          <code style={{ fontSize:11, color:"var(--text-muted)" }}>{campaignId}</code>
        </p>
      </div>

      {/* All-pending warning with retry button */}
      {allPending && (
        <div style={{ marginBottom:20, padding:"14px 18px", background:"var(--accent-amber-dim)", border:"1px solid var(--accent-amber)", borderRadius:"var(--radius)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <AlertCircle size={16} color="var(--accent-amber)" />
          <div style={{ flex:1 }}>
            <strong style={{ color:"var(--accent-amber)", fontSize:13 }}>Delivery events not received.</strong>
            <span style={{ color:"var(--text-secondary)", fontSize:13 }}> The channel service may not be running on port 8001.</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleRetryDispatch} disabled={retrying} id="retry-dispatch-btn">
            {retrying ? <><RefreshCw size={12} className="animate-spin" /> Retrying…</> : <><RefreshCw size={12} /> Retry Dispatch</>}
          </button>
        </div>
      )}

      {retryMsg && (
        <div style={{ marginBottom:16, padding:"10px 14px", background: retryMsg.includes("error") ? "var(--accent-rose-dim)" : "var(--accent-green-dim)", border:`1px solid ${retryMsg.includes("error") ? "var(--accent-rose)" : "var(--accent-green)"}`, borderRadius:"var(--radius-sm)", fontSize:13, color: retryMsg.includes("error") ? "var(--accent-rose)" : "var(--accent-green)" }}>
          {retryMsg}
        </div>
      )}

      {/* Metric cards — top 4 */}
      <div className="grid-4" style={{ marginBottom:16 }}>
        <MetricCard label="Sent"      value={sent}      total={total} color="var(--accent-amber)"  icon={<Send size={17} />} />
        <MetricCard label="Delivered" value={delivered} total={total} color="var(--accent-violet)" icon={<PackageCheck size={17} />} />
        <MetricCard label="Opened"    value={opened}    total={total} color="var(--accent-blue)"   icon={<MailOpen size={17} />} />
        <MetricCard label="Clicked"   value={clicked}   total={total} color="var(--accent-green)"  icon={<MousePointerClick size={17} />} />
      </div>

      {/* Secondary cards — read + converted */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28 }}>
        <div className="stat-card" style={{ padding:"14px 16px", "--accent-color":"#60a5fa" } as React.CSSProperties}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <BookOpen size={15} color="#60a5fa" />
            <span className="stat-label" style={{ margin:0 }}>Read</span>
          </div>
          <div style={{ fontWeight:800, fontSize:22, color:"#60a5fa", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{read}</div>
          <div style={{ fontSize:11.5, color:"var(--text-muted)", marginTop:3 }}>WhatsApp double-tick seen</div>
        </div>
        <div className="stat-card" style={{ padding:"14px 16px", "--accent-color":"#22c55e", borderColor: converted > 0 ? "rgba(34,197,94,0.3)" : undefined } as React.CSSProperties}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <ShoppingCart size={15} color="#22c55e" />
            <span className="stat-label" style={{ margin:0 }}>Converted</span>
          </div>
          <div style={{ fontWeight:800, fontSize:22, color:"#22c55e", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{converted}</div>
          <div style={{ fontSize:11.5, color:"var(--text-muted)", marginTop:3 }}>Orders attributed to campaign</div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems:"flex-start" }}>
        {/* Event feed */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Radio size={13} style={{ display:"inline", marginRight:6, verticalAlign:"middle" }} />
              Live Event Feed
            </h3>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>{logs.length} recipients</span>
          </div>

          {sortedLogs.length === 0 ? (
            <div className="empty-state">
              <Clock size={28} color="var(--text-muted)" />
              <span>Waiting for delivery events…</span>
            </div>
          ) : (
            <div className="event-feed">
              {sortedLogs.map((log) => {
                const meta = STATUS_META[log.status] || STATUS_META.pending;
                return (
                  <div key={log.id} className="event-item">
                    <div className="event-dot" style={{ background:meta.color }} />
                    <div style={{ color:meta.color, flexShrink:0 }}>{meta.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, color:"var(--text-primary)", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {log.customer_name || "Unknown"}
                      </div>
                      <div style={{ color:"var(--text-muted)", fontSize:11.5 }}>
                        {log.channel} · {meta.label}
                        {log.sent_at ? ` · ${new Date(log.sent_at).toLocaleTimeString()}` : ""}
                      </div>
                    </div>
                    <span style={{ fontSize:11, color:meta.color, background:`${meta.color}15`, padding:"2px 7px", borderRadius:99, flexShrink:0 }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Delivery breakdown */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <BarChart3 size={13} style={{ display:"inline", marginRight:6, verticalAlign:"middle" }} />
                Delivery Funnel
              </h3>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <DeliveryBar label="Sent"      count={sent}      total={total} color="var(--accent-amber)" />
              <DeliveryBar label="Delivered" count={delivered} total={total} color="var(--accent-violet)" />
              <DeliveryBar label="Read"      count={read}      total={total} color="#60a5fa" />
              <DeliveryBar label="Opened"    count={opened}    total={total} color="var(--accent-blue)" />
              <DeliveryBar label="Clicked"   count={clicked}   total={total} color="var(--accent-green)" />
              <DeliveryBar label="Converted" count={converted} total={total} color="#22c55e" />
              <DeliveryBar label="Failed"    count={failed}    total={total} color="var(--accent-rose)" />
            </div>

            {failed > 0 && (
              <div style={{ marginTop:14, padding:"10px 14px", background:"var(--accent-rose-dim)", borderRadius:"var(--radius-sm)", display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"var(--accent-rose)" }}>
                <XCircle size={13} /> {failed} messages failed to deliver
              </div>
            )}
          </div>

          {/* Engagement rates */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <TrendingUp size={13} style={{ display:"inline", marginRight:6, verticalAlign:"middle" }} />
                Engagement Rates
              </h3>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"Delivery Rate",  value:sent > 0      ? `${Math.round((delivered/sent)*100)}%`      : "—", color:"var(--accent-violet)" },
                { label:"Read Rate",      value:delivered > 0 ? `${Math.round((read/delivered)*100)}%`      : "—", color:"#60a5fa" },
                { label:"Open Rate",      value:delivered > 0 ? `${Math.round((opened/delivered)*100)}%`    : "—", color:"var(--accent-blue)" },
                { label:"Click Rate",     value:opened > 0    ? `${Math.round((clicked/opened)*100)}%`      : "—", color:"var(--accent-green)" },
                { label:"Conversion",     value:clicked > 0   ? `${Math.round((converted/clicked)*100)}%`   : "—", color:"#22c55e" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"var(--bg-base)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)" }}>
                  <span style={{ fontSize:13, color:"var(--text-secondary)" }}>{label}</span>
                  <span style={{ fontSize:14, fontWeight:800, color }}>{value}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={() => router.push(`/insights/${campaignId}`)}
              style={{ width:"100%", marginTop:16 }} id="view-insights-btn">
              <BarChart3 size={13} /> View Full Insights
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginTop:16, padding:"12px 16px", background:"var(--accent-rose-dim)", borderRadius:"var(--radius-sm)", color:"var(--accent-rose)", fontSize:13 }}>
          Failed to fetch monitor data. Make sure the backend is running on port 8000.
        </div>
      )}
    </div>
  );
}
