"use client";
import { use } from "react";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Users,
  MessageSquare,
  Radio,
  BarChart3,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  Zap,
  Clock,
  DollarSign,
  Send,
} from "lucide-react";
import { getCampaignSSEUrl, approveCampaign } from "@/lib/api";
import type { AgentEvent, ApprovalSummary } from "@/lib/types";

const STEPS = [
  { key: "strategy", label: "Strategy Agent", icon: Brain, desc: "Classifying goal & defining approach" },
  { key: "audience", label: "Audience Agent", icon: Users, desc: "Querying customer database" },
  { key: "content", label: "Content Agent", icon: MessageSquare, desc: "Crafting personalized message" },
  { key: "channel", label: "Channel Agent", icon: Radio, desc: "Selecting optimal delivery channel" },
  { key: "prediction", label: "Prediction Agent", icon: BarChart3, desc: "Forecasting campaign performance" },
];

function StatusDot({ status }: { status: string }) {
  const cls = `timeline-dot status-${status}`;
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock size={14} />,
    active: <Loader2 size={14} className="animate-spin" />,
    done: <CheckCircle2 size={14} />,
    error: <AlertCircle size={14} />,
    waiting: <Clock size={14} />,
  };
  return <div className={cls}>{icons[status] || <Clock size={14} />}</div>;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 16px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: campaignId } = use(params);

  const [stepStatuses, setStepStatuses] = useState<Record<string, string>>({
    strategy: "pending", audience: "pending", content: "pending",
    channel: "pending", prediction: "pending",
  });
  const [stepOutputs, setStepOutputs] = useState<Record<string, string>>({});
  const [stepData, setStepData] = useState<Record<string, AgentEvent>>({});
  const [approvalData, setApprovalData] = useState<ApprovalSummary | null>(null);
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState(false);
  const [done, setDone] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = getCampaignSSEUrl(campaignId);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: AgentEvent = JSON.parse(e.data);
        const { step, status, output } = event;

        if (step === "approval") {
          setStepStatuses((prev) => ({ ...prev }));
          setApprovalData(event.summary || null);
          setCustomerIds(event.customer_ids || []);
          setCustomerNames(event.customer_names || {});
          setDone(true);
          es.close();
          return;
        }

        setStepStatuses((prev) => ({ ...prev, [step]: status }));
        if (output) {
          setStepOutputs((prev) => ({ ...prev, [step]: output }));
        }
        setStepData((prev) => ({ ...prev, [step]: event }));
      } catch {}
    };

    es.onerror = () => {
      setStreamError("Lost connection to agent stream. The campaign may still be processing.");
      es.close();
    };

    return () => es.close();
  }, [campaignId]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveCampaign(campaignId);
      router.push(`/monitor/${campaignId}`);
    } catch (err: any) {
      setStreamError(err.message || "Failed to approve campaign.");
      setApproving(false);
    }
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Zap size={20} color="var(--accent-violet)" />
          <h1 className="page-title" style={{ fontSize: "1.5rem" }}>Agent Timeline</h1>
          {done ? (
            <span className="badge badge-green">Ready for Approval</span>
          ) : (
            <span className="badge badge-violet">Running</span>
          )}
        </div>
        <p className="page-subtitle">Campaign ID: <code style={{ fontSize: 12, color: "var(--text-muted)" }}>{campaignId}</code></p>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Timeline */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {STEPS.map(({ key, label, icon: Icon, desc }, i) => {
            const status = stepStatuses[key] || "pending";
            const output = stepOutputs[key];
            const isLast = i === STEPS.length - 1;

            return (
              <div key={key} className="timeline-step">
                <div className="timeline-connector">
                  <StatusDot status={status} />
                  {!isLast && <div className="timeline-line" />}
                </div>
                <div className="timeline-body">
                  <div className="timeline-header">
                    <span className="timeline-title">{label}</span>
                    {status === "active" && (
                      <span className="badge badge-violet" style={{ fontSize: 10 }}>Processing</span>
                    )}
                    {status === "done" && (
                      <span className="badge badge-green" style={{ fontSize: 10 }}>Done</span>
                    )}
                    {status === "error" && (
                      <span className="badge badge-rose" style={{ fontSize: 10 }}>Error</span>
                    )}
                  </div>

                  {status === "pending" && (
                    <div style={{ color: "var(--text-muted)", fontSize: 12.5, marginBottom: 8 }}>{desc}</div>
                  )}

                  {(status === "active" || status === "done" || status === "error") && (
                    <div className={`timeline-card ${status === "active" ? "typing-cursor" : ""}`}>
                      {output ? (
                        <span dangerouslySetInnerHTML={{ __html: output.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>{desc}…</span>
                      )}
                      {/* Extra data pills */}
                      {status === "done" && stepData[key] && (
                        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {key === "audience" && stepData[key].audience_size !== undefined && (
                            <span className="badge badge-blue">
                              <Users size={10} /> {stepData[key].audience_size} recipients
                            </span>
                          )}
                          {key === "content" && stepData[key].discount_code && (
                            <span className="badge badge-amber">
                              Code: {stepData[key].discount_code}
                            </span>
                          )}
                          {key === "channel" && stepData[key].channel && (
                            <span className="badge badge-violet">
                              {stepData[key].channel} · ₹{stepData[key].estimated_cost}
                            </span>
                          )}
                          {key === "prediction" && stepData[key].predictions && (
                            <span className="badge badge-green">
                              {pct(stepData[key].predictions!.open_rate)} open rate
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Approval Panel */}
        {done && approvalData && (
          <div
            style={{ width: 340, flexShrink: 0 }}
          >
            <div
              className="card"
              style={{
                borderColor: "rgba(124,92,252,0.3)",
                background: "linear-gradient(160deg, var(--bg-card), var(--accent-violet-dim))",
                animation: "slideInUp 0.4s ease forwards",
                position: "sticky",
                top: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <Zap size={18} color="var(--accent-violet)" />
                <h3 style={{ color: "var(--text-primary)", fontSize: 15 }}>Campaign Ready</h3>
              </div>

              {/* Key Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                <MetricPill label="Channel" value={approvalData.channel} />
                <MetricPill label="Audience" value={String(approvalData.audience_size)} />
                <MetricPill label="Est. Cost" value={`₹${approvalData.estimated_cost}`} />
                <MetricPill label="Type" value={approvalData.campaign_type} />
              </div>

              {/* Message Preview */}
              <div style={{ marginBottom: 16 }}>
                <div className="label" style={{ marginBottom: 8 }}>Message Preview</div>
                <div
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px 14px",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  {approvalData.message?.replace("{name}", "Customer") || "—"}
                </div>
              </div>

              {/* Predictions */}
              {approvalData.predictions && (
                <div style={{ marginBottom: 20 }}>
                  <div className="label" style={{ marginBottom: 10 }}>Predicted Performance</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Open Rate", value: approvalData.predictions.open_rate, color: "var(--accent-blue)" },
                      { label: "Click Rate", value: approvalData.predictions.ctr, color: "var(--accent-violet)" },
                      { label: "Conversion", value: approvalData.predictions.conversion_rate, color: "var(--accent-green)" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12.5 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                          <span style={{ color, fontWeight: 700 }}>{pct(value)}</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: pct(value), "--accent-color": color } as React.CSSProperties}
                          />
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                      Est. {approvalData.predictions.estimated_conversions} conversions — {approvalData.predictions.reasoning}
                    </div>
                  </div>
                </div>
              )}

              {/* Approve Button */}
              <button
                id="approve-launch-btn"
                className="btn btn-success"
                onClick={handleApprove}
                disabled={approving}
                style={{ width: "100%" }}
              >
                {approving ? (
                  <>
                    <Loader2 size={16} />
                    Dispatching…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Approve & Launch
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {streamError && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            background: "var(--accent-rose-dim)",
            borderRadius: "var(--radius-sm)",
            color: "var(--accent-rose)",
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} />
          {streamError}
        </div>
      )}
    </div>
  );
}
