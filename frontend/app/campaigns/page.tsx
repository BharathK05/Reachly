"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Layers,
  GitBranch,
  Radio,
  BarChart3,
  Trash2,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  ChevronRight,
} from "lucide-react";
import { listCampaigns, deleteCampaign } from "@/lib/api";
import type { Campaign } from "@/lib/types";

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:    { label: "Draft",    color: "var(--text-muted)",    icon: <FileText size={13} /> },
  running:  { label: "Running",  color: "var(--accent-violet)", icon: <Clock size={13} /> },
  approved: { label: "Live",     color: "var(--accent-green)",  icon: <CheckCircle2 size={13} /> },
  error:    { label: "Error",    color: "var(--accent-rose)",   icon: <AlertCircle size={13} /> },
};

function CampaignCard({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = STATUS_META[campaign.status] || STATUS_META.draft;

  const displayName = campaign.name || `Campaign · ${campaign.id.slice(0, 8)}`;
  const date = campaign.created_at
    ? new Date(campaign.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteCampaign(campaign.id);
      onDelete();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Layers size={18} color="var(--accent-violet)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
            {date} {campaign.channel && `· ${campaign.channel}`} {campaign.audience_size ? `· ${campaign.audience_size} recipients` : ""}
          </div>
        </div>
        {/* Status badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: meta.color, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {meta.icon} {meta.label}
        </div>
      </div>

      {/* Goal */}
      <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {campaign.goal}
      </p>

      {/* Budget / Cost row */}
      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
        <span style={{ color: "var(--text-muted)" }}>Budget: <strong style={{ color: "var(--text-secondary)" }}>₹{Number(campaign.budget).toLocaleString()}</strong></span>
        {campaign.estimated_cost && (
          <span style={{ color: "var(--text-muted)" }}>Cost: <strong style={{ color: "var(--accent-green)" }}>₹{campaign.estimated_cost}</strong></span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          id={`timeline-btn-${campaign.id}`}
          className="btn btn-secondary btn-sm"
          onClick={() => router.push(`/timeline/${campaign.id}`)}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <GitBranch size={13} /> Timeline <ChevronRight size={12} />
        </button>
        <button
          id={`monitor-btn-${campaign.id}`}
          className="btn btn-secondary btn-sm"
          onClick={() => router.push(`/monitor/${campaign.id}`)}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Radio size={13} /> Monitor
        </button>
        <button
          id={`insights-btn-${campaign.id}`}
          className="btn btn-secondary btn-sm"
          onClick={() => router.push(`/insights/${campaign.id}`)}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <BarChart3 size={13} /> Insights
        </button>
        <button
          id={`delete-btn-${campaign.id}`}
          className="btn btn-sm"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: confirmDelete ? "var(--accent-rose-dim)" : "transparent",
            border: `1px solid ${confirmDelete ? "var(--accent-rose)" : "var(--border)"}`,
            color: confirmDelete ? "var(--accent-rose)" : "var(--text-muted)",
            padding: "6px 10px",
            minWidth: 36,
          }}
          title={confirmDelete ? "Click again to confirm delete" : "Delete campaign"}
        >
          {deleting ? "…" : <Trash2 size={13} />}
        </button>
      </div>
      {confirmDelete && !deleting && (
        <p style={{ fontSize: 11.5, color: "var(--accent-rose)", margin: 0, textAlign: "right" }}>
          Click 🗑 again to confirm deletion
        </p>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, mutate } = useSWR("campaigns-list", listCampaigns, { refreshInterval: 5000 });
  const campaigns = data?.campaigns || [];

  const filtered = campaigns.filter((c) => {
    const matchSearch =
      !search ||
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      c.goal.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Layers size={20} color="var(--accent-violet)" />
              <h1 className="page-title" style={{ fontSize: "1.5rem" }}>My Campaigns</h1>
              <span className="badge badge-violet" style={{ fontSize: 12 }}>{campaigns.length}</span>
            </div>
            <p className="page-subtitle">View, resume, and manage all your AI campaigns</p>
          </div>
          <button
            id="new-campaign-btn"
            className="btn btn-primary"
            onClick={() => router.push("/studio")}
          >
            <Plus size={15} /> New Campaign
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            id="campaign-search"
            type="text"
            placeholder="Search by name or goal…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        {/* Status filter pills */}
        {["all", "draft", "approved", "running", "error"].map((s) => (
          <button
            key={s}
            id={`filter-${s}`}
            onClick={() => setStatusFilter(s)}
            className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-secondary"}`}
            style={{ textTransform: "capitalize" }}
          >
            {s === "all" ? "All" : STATUS_META[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <Layers size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
            {campaigns.length === 0
              ? "No campaigns yet. Create your first AI campaign."
              : "No campaigns match your filter."}
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/studio")} id="empty-new-btn">
            <Plus size={15} /> New Campaign
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((c) => (
            <CampaignCard key={c.id} campaign={c} onDelete={() => mutate()} />
          ))}
        </div>
      )}
    </div>
  );
}
