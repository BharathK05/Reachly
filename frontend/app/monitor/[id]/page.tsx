"use client";
import { use } from "react";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Radio,
  Send,
  PackageCheck,
  MailOpen,
  MousePointerClick,
  XCircle,
  Clock,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { fetchMonitor } from "@/lib/api";
import type { MonitorResponse, CommunicationLog } from "@/lib/types";

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  clicked:   { label: "Clicked",   color: "var(--accent-green)",  icon: <MousePointerClick size={14} /> },
  opened:    { label: "Opened",    color: "var(--accent-blue)",   icon: <MailOpen size={14} /> },
  delivered: { label: "Delivered", color: "var(--accent-violet)", icon: <PackageCheck size={14} /> },
  sent:      { label: "Sent",      color: "var(--accent-amber)",  icon: <Send size={14} /> },
  failed:    { label: "Failed",    color: "var(--accent-rose)",   icon: <XCircle size={14} /> },
  pending:   { label: "Pending",   color: "var(--text-muted)",    icon: <Clock size={14} /> },
};

function StatCard({ label, value, total, color, icon }: {
  label: string; value: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="stat-card" style={{ "--accent-color": color } as React.CSSProperties}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color }}>{value.toLocaleString()}</div>
        </div>
        <div style={{ color, opacity: 0.7 }}>{icon}</div>
      </div>
      <div className="progress-bar" style={{ marginTop: 8 }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="stat-sub">{pct.toFixed(1)}% of total</div>
    </div>
  );
}

export default function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: campaignId } = use(params);

  const { data, error } = useSWR<MonitorResponse>(
    `monitor-${campaignId}`,
    () => fetchMonitor(campaignId),
    { refreshInterval: 2000 }
  );

  const summary = data?.summary || {};
  const logs: CommunicationLog[] = data?.logs || [];
  const total = (summary.sent || 0) + (summary.pending || 0);

  // Sort logs newest first
  const sortedLogs = [...logs].reverse();

  // Delivery breakdown for bar chart
  const breakdownItems = [
    { key: "clicked",   label: "Clicked",   color: "var(--accent-green)" },
    { key: "opened",    label: "Opened",    color: "var(--accent-blue)" },
    { key: "delivered", label: "Delivered", color: "var(--accent-violet)" },
    { key: "sent",      label: "Sent",      color: "var(--accent-amber)" },
    { key: "failed",    label: "Failed",    color: "var(--accent-rose)" },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <button
            onClick={() => router.back()}
            className="btn btn-secondary btn-sm"
            aria-label="Go back"
            id="monitor-back-btn"
          >
            <ArrowLeft size={14} />
          </button>
          <Radio size={20} color="var(--accent-green)" />
          <h1 className="page-title" style={{ fontSize: "1.5rem" }}>Live Monitor</h1>
          <span className="badge badge-green" style={{ animation: "pulse-ring 2s infinite" }}>Live</span>
        </div>
        <p className="page-subtitle">
          Real-time delivery tracking · Refreshes every 2s ·{" "}
          <code style={{ fontSize: 12, color: "var(--text-muted)" }}>{campaignId}</code>
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard label="Sent" value={summary.sent || 0} total={total} color="var(--accent-amber)" icon={<Send size={20} />} />
        <StatCard label="Delivered" value={summary.delivered || 0} total={total} color="var(--accent-violet)" icon={<PackageCheck size={20} />} />
        <StatCard label="Opened" value={summary.opened || 0} total={total} color="var(--accent-blue)" icon={<MailOpen size={20} />} />
        <StatCard label="Clicked" value={summary.clicked || 0} total={total} color="var(--accent-green)" icon={<MousePointerClick size={20} />} />
      </div>

      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        {/* Event Feed */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Radio size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              Live Event Feed
            </h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{logs.length} recipients</span>
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
                    <div className="event-dot" style={{ background: meta.color }} />
                    <div style={{ color: meta.color, flexShrink: 0 }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.customer_name || "Unknown"}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                        {log.channel} · {meta.label}
                        {log.sent_at && ` · ${new Date(log.sent_at).toLocaleTimeString()}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delivery Breakdown */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <BarChart3 size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              Delivery Breakdown
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {breakdownItems.map(({ key, label, color }) => {
              const count = summary[key] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color, fontWeight: 700 }}>{count.toLocaleString()}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 40, textAlign: "right" }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, "--accent-color": color } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Failed count */}
          {(summary.failed || 0) > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 14px",
                background: "var(--accent-rose-dim)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                color: "var(--accent-rose)",
              }}
            >
              <XCircle size={14} />
              {summary.failed} messages failed to deliver
            </div>
          )}

          {/* Navigate to Insights */}
          <button
            className="btn btn-secondary"
            onClick={() => router.push(`/insights/${campaignId}`)}
            style={{ width: "100%", marginTop: 20 }}
            id="view-insights-btn"
          >
            <BarChart3 size={14} />
            View Full Insights
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--accent-rose-dim)", borderRadius: "var(--radius-sm)", color: "var(--accent-rose)", fontSize: 13 }}>
          Failed to fetch monitor data. Make sure the backend is running.
        </div>
      )}
    </div>
  );
}
