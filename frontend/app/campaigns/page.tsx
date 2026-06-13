"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Layers, GitBranch, Radio, BarChart3, Trash2, Plus,
  Clock, CheckCircle2, AlertCircle, FileText, Search,
} from "lucide-react";
import { listCampaigns, deleteCampaign } from "@/lib/api";
import type { Campaign } from "@/lib/types";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:    { label:"Draft",   color:"var(--text-muted)",    bg:"var(--bg-card-hover)",      icon:<FileText size={12} /> },
  running:  { label:"Running", color:"var(--accent-violet)", bg:"var(--accent-violet-dim)",  icon:<Clock size={12} /> },
  approved: { label:"Live",    color:"var(--accent-green)",  bg:"var(--accent-green-dim)",   icon:<CheckCircle2 size={12} /> },
  error:    { label:"Error",   color:"var(--accent-rose)",   bg:"var(--accent-rose-dim)",    icon:<AlertCircle size={12} /> },
};

function CampaignRow({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = STATUS_META[campaign.status] || STATUS_META.draft;

  const displayName = campaign.name || `Campaign · ${campaign.id.slice(0, 8)}`;
  const date = campaign.created_at
    ? new Date(campaign.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
    : "";

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await deleteCampaign(campaign.id); onDelete(); }
    catch { setDeleting(false); setConfirmDelete(false); }
  };

  return (
    <div
      className="card"
      style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}
      onMouseLeave={() => setConfirmDelete(false)}
    >
      {/* Icon */}
      <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:"var(--accent-violet-dim)", border:"1px solid rgba(124,92,252,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Layers size={17} color="var(--accent-violet)" />
      </div>

      {/* Main info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
          <span style={{ fontWeight:700, color:"var(--text-primary)", fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayName}</span>
          <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:meta.color, background:meta.bg, padding:"2px 8px", borderRadius:99, flexShrink:0 }}>
            {meta.icon} {meta.label}
          </span>
        </div>
        <p style={{ color:"var(--text-secondary)", fontSize:12.5, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {campaign.goal}
        </p>
        <div style={{ display:"flex", gap:14, marginTop:4, fontSize:11.5, color:"var(--text-muted)" }}>
          <span>{date}</span>
          {campaign.channel && <span>· {campaign.channel}</span>}
          {campaign.audience_size ? <span>· {campaign.audience_size} recipients</span> : null}
          {campaign.budget ? <span>· Budget ₹{Number(campaign.budget).toLocaleString()}</span> : null}
          {campaign.estimated_cost ? <span>· Est. ₹{campaign.estimated_cost}</span> : null}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
        <button id={`timeline-btn-${campaign.id}`} className="btn btn-secondary btn-sm"
          onClick={() => router.push(`/timeline/${campaign.id}`)}>
          <GitBranch size={12} /> Timeline
        </button>
        <button id={`monitor-btn-${campaign.id}`} className="btn btn-secondary btn-sm"
          onClick={() => router.push(`/monitor/${campaign.id}`)}>
          <Radio size={12} /> Monitor
        </button>
        <button id={`insights-btn-${campaign.id}`} className="btn btn-secondary btn-sm"
          onClick={() => router.push(`/insights/${campaign.id}`)}>
          <BarChart3 size={12} /> Insights
        </button>
        <button
          id={`delete-btn-${campaign.id}`}
          className="btn btn-sm"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: confirmDelete ? "var(--accent-rose-dim)" : "transparent",
            border:`1px solid ${confirmDelete ? "var(--accent-rose)" : "var(--border)"}`,
            color: confirmDelete ? "var(--accent-rose)" : "var(--text-muted)",
            padding:"6px 10px",
          }}
          title={confirmDelete ? "Click to confirm delete" : "Delete campaign"}
        >
          {deleting ? "…" : <Trash2 size={12} />}
        </button>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, mutate } = useSWR("campaigns-list", listCampaigns, { refreshInterval: 10000 });
  const campaigns = data?.campaigns || [];

  const filtered = campaigns.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q
      || (c.name || "").toLowerCase().includes(q)
      || (c.goal || "").toLowerCase().includes(q)
      || (c.channel || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="page-content-wide">
      {/* Header */}
      <div className="page-header">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
              <Layers size={20} color="var(--accent-violet)" />
              <h1 className="page-title" style={{ fontSize:"1.5rem" }}>My Campaigns</h1>
              <span className="badge badge-violet" style={{ fontSize:12 }}>{campaigns.length}</span>
            </div>
            <p className="page-subtitle">View, resume, and manage all your AI campaigns</p>
          </div>
          <button id="new-campaign-btn" className="btn btn-primary" onClick={() => router.push("/studio")}>
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* Search + filter row */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:220 }}>
          <Search size={13} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)" }} />
          <input
            id="campaign-search"
            type="text"
            placeholder="Search by name, goal, or channel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft:32 }}
          />
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[
            { key:"all", label:"All" },
            { key:"draft", label:"Draft" },
            { key:"approved", label:"Live" },
            { key:"running", label:"Running" },
            { key:"error", label:"Error" },
          ].map(({ key, label }) => (
            <button key={key} id={`filter-${key}`}
              onClick={() => setStatusFilter(key)}
              className={`btn btn-sm ${statusFilter === key ? "btn-primary" : "btn-secondary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign:"center", padding:"48px 32px" }}>
          <Layers size={40} color="var(--text-muted)" style={{ margin:"0 auto 16px" }} />
          <p style={{ color:"var(--text-secondary)", marginBottom:24 }}>
            {campaigns.length === 0
              ? "No campaigns yet. Create your first AI campaign."
              : `No campaigns match "${search || statusFilter}".`}
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/studio")} id="empty-new-btn">
            <Plus size={14} /> New Campaign
          </button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map((c) => (
            <CampaignRow key={c.id} campaign={c} onDelete={() => mutate()} />
          ))}
        </div>
      )}
    </div>
  );
}
