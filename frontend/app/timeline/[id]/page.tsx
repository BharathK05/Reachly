"use client";
import { use } from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Brain, Users, MessageSquare, Radio, BarChart3,
  CheckCircle2, Loader2, AlertCircle, ChevronRight, Zap,
  Clock, Send, RefreshCw, Eye,
} from "lucide-react";
import { getCampaignSSEUrl, approveCampaign } from "@/lib/api";
import type { AgentEvent, ApprovalSummary } from "@/lib/types";

const PROXY = "/api/proxy";

const STEPS = [
  { key:"strategy",   label:"Strategy Agent",   icon:Brain,         desc:"Classifying goal & defining approach" },
  { key:"audience",   label:"Audience Agent",    icon:Users,         desc:"Querying customer database" },
  { key:"content",    label:"Content Agent",     icon:MessageSquare, desc:"Crafting personalized message" },
  { key:"channel",    label:"Channel Agent",     icon:Radio,         desc:"Selecting optimal delivery channel" },
  { key:"prediction", label:"Prediction Agent",  icon:BarChart3,     desc:"Forecasting campaign performance" },
];

function StatusDot({ status }: { status: string }) {
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock size={14} />,
    active:  <Loader2 size={14} className="animate-spin" />,
    done:    <CheckCircle2 size={14} />,
    error:   <AlertCircle size={14} />,
    waiting: <Clock size={14} />,
  };
  return <div className={`timeline-dot status-${status}`}>{icons[status] || <Clock size={14} />}</div>;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign:"center", padding:"12px 16px", background:"var(--bg-base)", borderRadius:"var(--radius-sm)", border:"1px solid var(--border)" }}>
      <div style={{ fontSize:18, fontWeight:800, color:"var(--text-primary)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{value}</div>
      <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2, fontWeight:600 }}>{label}</div>
    </div>
  );
}

// ── Dispatch progress steps ───────────────────────────────────────────────────
const DISPATCH_STEPS = ["Creating logs", "Contacting channel service", "Delivery started"];

function DispatchProgress({ step }: { step: number }) {
  return (
    <div style={{ marginTop:16 }}>
      {DISPATCH_STEPS.map((label, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, fontSize:12.5 }}>
          {i < step ? (
            <CheckCircle2 size={13} color="var(--accent-green)" />
          ) : i === step ? (
            <Loader2 size={13} color="var(--accent-violet)" className="animate-spin" />
          ) : (
            <div style={{ width:13, height:13, borderRadius:"50%", border:"2px solid var(--border)" }} />
          )}
          <span style={{ color: i <= step ? "var(--text-secondary)" : "var(--text-muted)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: campaignId } = use(params);

  const [stepStatuses, setStepStatuses] = useState<Record<string, string>>({
    strategy:"pending", audience:"pending", content:"pending", channel:"pending", prediction:"pending",
  });
  const [stepOutputs, setStepOutputs]   = useState<Record<string, string>>({});
  const [stepData, setStepData]         = useState<Record<string, AgentEvent>>({});
  const [approvalData, setApprovalData] = useState<ApprovalSummary | null>(null);
  const [done, setDone]                 = useState(false);
  const [streamError, setStreamError]   = useState<string | null>(null);

  const [approving, setApproving]       = useState(false);
  const [dispatchStep, setDispatchStep] = useState(-1);   // -1 = not started
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatched, setDispatched]     = useState(false);

  // For campaigns already run, load from cache
  const [loadingCache, setLoadingCache] = useState(true);
  const [alreadyApproved, setAlreadyApproved] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  // ── Load cached campaign data first ────────────────────────────────────────
  useEffect(() => {
    fetch(`${PROXY}/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then((campaign) => {
        const status = campaign.status;

        // If campaign already ran agents, reconstruct UI from stored data
        if (status && status !== "draft") {
          // Mark all steps done
          setStepStatuses({ strategy:"done", audience:"done", content:"done", channel:"done", prediction:"done" });

          // Reconstruct step outputs from stored campaign data
          setStepOutputs({
            strategy:   `**${campaign.audience_criteria ? "Campaign classified" : "Strategy analysed"}** — Goal understood`,
            audience:   `Found **${campaign.audience_size || 0}** matching customers.`,
            content:    campaign.message || "Message generated.",
            channel:    `Selected **${campaign.channel || "—"}** at ₹${campaign.estimated_cost || 0} total cost.`,
            prediction: campaign.predictions?.reasoning || "Predictions generated.",
          });

          // Build approvalData from campaign record
          const p = campaign.predictions || {};
          setApprovalData({
            campaign_type:  "Targeted",
            channel:        campaign.channel || "—",
            audience_size:  campaign.audience_size || 0,
            estimated_cost: campaign.estimated_cost || 0,
            message:        campaign.message || "",
            discount_code:  "",
            predictions:    {
              open_rate:            p.open_rate || 0,
              ctr:                  p.ctr || 0,
              conversion_rate:      p.conversion_rate || 0,
              estimated_conversions:p.estimated_conversions || 0,
              reasoning:            p.reasoning || "",
            },
          });

          setDone(true);

          if (status === "approved") {
            setAlreadyApproved(true);
            setDispatched(true);
          }
        } else {
          // Campaign is draft — run SSE stream
          startSSE();
        }
      })
      .catch(() => {
        // If fetch fails, just start SSE
        startSSE();
      })
      .finally(() => setLoadingCache(false));

    return () => eventSourceRef.current?.close();
  }, [campaignId]);

  const startSSE = () => {
    const url = getCampaignSSEUrl(campaignId);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: AgentEvent = JSON.parse(e.data);
        const { step, status, output } = event;

        if (step === "approval") {
          setApprovalData(event.summary || null);
          setDone(true);
          es.close();
          return;
        }

        setStepStatuses((prev) => ({ ...prev, [step]: status }));
        if (output) setStepOutputs((prev) => ({ ...prev, [step]: output }));
        setStepData((prev) => ({ ...prev, [step]: event }));
      } catch {}
    };

    es.onerror = () => {
      setStreamError("Lost connection to agent stream.");
      es.close();
    };
  };

  // ── Approve & dispatch ──────────────────────────────────────────────────────
  const handleApprove = async () => {
    setApproving(true);
    setDispatchError(null);
    setDispatchStep(0);

    try {
      // Step 1 — creating logs (visual only, small delay)
      await new Promise((r) => setTimeout(r, 600));
      setDispatchStep(1);

      const result = await approveCampaign(campaignId);
      setDispatchStep(2);

      // Check if channel service responded properly
      if ((result as any).channel_service_ok === false) {
        setDispatchError(
          `Campaign approved but channel service error: ${(result as any).channel_error}. ` +
          `Make sure the channel service is running on port 8001.`
        );
      }

      await new Promise((r) => setTimeout(r, 500));
      setDispatched(true);

    } catch (err: any) {
      setDispatchError(err.message || "Failed to approve campaign.");
      setApproving(false);
      setDispatchStep(-1);
    }
  };

  if (loadingCache) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}>
        <Loader2 size={28} color="var(--accent-violet)" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-content-wide">
      {/* Header */}
      <div className="page-header">
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <Zap size={20} color="var(--accent-violet)" />
          <h1 className="page-title" style={{ fontSize:"1.5rem" }}>Agent Timeline</h1>
          {dispatched || alreadyApproved ? (
            <span className="badge badge-green">Live</span>
          ) : done ? (
            <span className="badge badge-violet">Ready for Approval</span>
          ) : (
            <span className="badge badge-violet">Running</span>
          )}
        </div>
        <p className="page-subtitle">
          Campaign: <code style={{ fontSize:12, color:"var(--text-muted)" }}>{campaignId}</code>
        </p>
      </div>

      <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
        {/* ── Agent Steps ── */}
        <div style={{ flex:1, minWidth:0 }}>
          {STEPS.map(({ key, label, icon:Icon, desc }, i) => {
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
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Icon size={15} color={status === "done" ? "var(--accent-green)" : status === "active" ? "var(--accent-violet)" : "var(--text-muted)"} />
                      <span className="timeline-title">{label}</span>
                    </div>
                    {status === "active" && <span className="badge badge-violet" style={{ fontSize:10 }}>Processing</span>}
                    {status === "done"   && <span className="badge badge-green"  style={{ fontSize:10 }}>Done</span>}
                    {status === "error"  && <span className="badge badge-rose"   style={{ fontSize:10 }}>Error</span>}
                  </div>

                  {status === "pending" && (
                    <div style={{ color:"var(--text-muted)", fontSize:12.5, marginBottom:8 }}>{desc}</div>
                  )}

                  {(status === "active" || status === "done" || status === "error") && (
                    <div className={`timeline-card ${status === "active" ? "typing-cursor" : ""}`}>
                      {output ? (
                        <span dangerouslySetInnerHTML={{ __html: output.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                      ) : (
                        <span style={{ color:"var(--text-muted)" }}>{desc}…</span>
                      )}
                      {status === "done" && stepData[key] && (
                        <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:8 }}>
                          {key === "audience"   && stepData[key].audience_size !== undefined && (
                            <span className="badge badge-blue"><Users size={10} /> {stepData[key].audience_size} recipients</span>
                          )}
                          {key === "content"    && stepData[key].discount_code && (
                            <span className="badge badge-amber">Code: {stepData[key].discount_code}</span>
                          )}
                          {key === "channel"    && stepData[key].channel && (
                            <span className="badge badge-violet">{stepData[key].channel} · ₹{stepData[key].estimated_cost}</span>
                          )}
                          {key === "prediction" && stepData[key].predictions && (
                            <span className="badge badge-green">{pct(stepData[key].predictions!.open_rate)} open rate</span>
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

        {/* ── Approval / Status Panel ── */}
        {done && approvalData && (
          <div style={{ width:340, flexShrink:0 }}>
            <div
              className="card"
              style={{ borderColor:"rgba(124,92,252,0.3)", background:"linear-gradient(160deg, var(--bg-card), var(--accent-violet-dim))", position:"sticky", top:0, animation:"slideInUp 0.4s ease" }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
                {dispatched || alreadyApproved ? <Send size={16} color="var(--accent-green)" /> : <Zap size={16} color="var(--accent-violet)" />}
                <h3 style={{ fontSize:15 }}>
                  {dispatched || alreadyApproved ? "Campaign Dispatched" : "Campaign Ready"}
                </h3>
              </div>

              {/* Key Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>
                <MetricPill label="Channel"   value={approvalData.channel} />
                <MetricPill label="Audience"  value={String(approvalData.audience_size)} />
                <MetricPill label="Est. Cost" value={`₹${approvalData.estimated_cost}`} />
                <MetricPill label="Type"      value={approvalData.campaign_type || "Targeted"} />
              </div>

              {/* Message Preview */}
              <div style={{ marginBottom:16 }}>
                <div className="label" style={{ marginBottom:8 }}>Message Preview</div>
                <div style={{ background:"var(--bg-base)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"12px 14px", fontSize:13, color:"var(--text-secondary)", lineHeight:1.6, fontStyle:"italic" }}>
                  {approvalData.message?.replace("{name}", "Customer") || "—"}
                </div>
              </div>

              {/* Predictions */}
              {approvalData.predictions && (
                <div style={{ marginBottom:18 }}>
                  <div className="label" style={{ marginBottom:10 }}>Predicted Performance</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {[
                      { label:"Open Rate",   value:approvalData.predictions.open_rate,       color:"var(--accent-blue)" },
                      { label:"Click Rate",  value:approvalData.predictions.ctr,             color:"var(--accent-violet)" },
                      { label:"Conversion",  value:approvalData.predictions.conversion_rate, color:"var(--accent-green)" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12.5 }}>
                          <span style={{ color:"var(--text-secondary)" }}>{label}</span>
                          <span style={{ color, fontWeight:700 }}>{pct(value)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width:pct(value), "--accent-color":color } as React.CSSProperties} />
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize:11.5, color:"var(--text-muted)", marginTop:2, lineHeight:1.5 }}>
                      Est. {approvalData.predictions.estimated_conversions} conversions
                    </div>
                  </div>
                </div>
              )}

              {/* ── Dispatch error ── */}
              {dispatchError && (
                <div style={{ padding:"10px 12px", background:"var(--accent-rose-dim)", border:"1px solid var(--accent-rose)", borderRadius:"var(--radius-sm)", fontSize:12.5, color:"var(--accent-rose)", marginBottom:14, lineHeight:1.5 }}>
                  <AlertCircle size={13} style={{ display:"inline", marginRight:5, verticalAlign:"middle" }} />
                  {dispatchError}
                </div>
              )}

              {/* ── Dispatching progress ── */}
              {approving && !dispatched && <DispatchProgress step={dispatchStep} />}

              {/* ── CTA Button ── */}
              {dispatched || alreadyApproved ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  <button
                    className="btn btn-success"
                    onClick={() => router.push(`/monitor/${campaignId}`)}
                    style={{ width:"100%" }}
                    id="view-monitor-btn"
                  >
                    <Eye size={14} /> View Live Monitor
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => router.push(`/insights/${campaignId}`)}
                    style={{ width:"100%" }}
                    id="view-insights-btn"
                  >
                    <BarChart3 size={13} /> View Insights
                  </button>
                </div>
              ) : (
                <button
                  id="approve-launch-btn"
                  className="btn btn-success"
                  onClick={handleApprove}
                  disabled={approving}
                  style={{ width:"100%", marginTop:8 }}
                >
                  {approving ? (
                    <><Loader2 size={15} className="animate-spin" /> Dispatching…</>
                  ) : (
                    <><Send size={15} /> Approve & Launch <ChevronRight size={14} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {streamError && (
        <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:8, padding:"12px 16px", background:"var(--accent-rose-dim)", borderRadius:"var(--radius-sm)", color:"var(--accent-rose)", fontSize:13 }}>
          <AlertCircle size={15} /> {streamError}
          <button className="btn btn-secondary btn-sm" onClick={startSSE} style={{ marginLeft:"auto" }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
