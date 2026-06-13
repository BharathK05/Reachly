"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import {
  Users, ShoppingBag, DollarSign, TrendingUp,
  Upload, CloudUpload, CheckCircle2, AlertCircle, Clock,
  Star, X, FileText, Search, ChevronRight, ArrowLeft,
  Mail, Phone, MapPin, Award, Calendar, Package,
} from "lucide-react";
import { fetchStats, uploadData, fetchCustomers, fetchCustomerDetail, fetchOrders } from "@/lib/api";
import type { StatsResponse } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";

const TIER_COLORS: Record<string, string> = {
  Gold: "var(--accent-amber)",
  Silver: "var(--text-secondary)",
  Bronze: "#cd7f32",
};

// ── Upload Drawer ──────────────────────────────────────────────────────────────
function UploadDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [customersFile, setCustomersFile] = useState<File | null>(null);
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const [dragging, setDragging] = useState<"customers" | "orders" | null>(null);
  const customersRef = useRef<HTMLInputElement>(null);
  const ordersRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!customersFile || !ordersFile) { setResult({ error: "Select both CSV files." }); return; }
    setUploading(true); setResult(null);
    try {
      const r = await uploadData(customersFile, ordersFile);
      setResult({ success: `✓ ${r.customers_processed} customers and ${r.orders_processed} orders uploaded.` });
      setCustomersFile(null); setOrdersFile(null);
      onSuccess();
    } catch (e: any) { setResult({ error: e.message || "Upload failed." }); }
    finally { setUploading(false); }
  };

  const handleDrop = useCallback((type: "customers" | "orders") => (e: React.DragEvent) => {
    e.preventDefault(); setDragging(null);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) type === "customers" ? setCustomersFile(file) : setOrdersFile(file);
  }, []);

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
      <div style={{ position:"relative", width:420, background:"var(--bg-surface)", borderLeft:"1px solid var(--border)", padding:28, display:"flex", flexDirection:"column", gap:16, overflowY:"auto", animation:"slideInUp 0.25s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ fontSize:"1.1rem" }}>Import Data</h2>
          <button onClick={onClose} className="icon-btn"><X size={14} /></button>
        </div>
        <p style={{ fontSize:13, color:"var(--text-secondary)" }}>Upload customers.csv and orders.csv to populate your CRM.</p>
        
        {[
          { type: "customers" as const, file: customersFile, ref: customersRef, set: setCustomersFile, label:"customers.csv", hint:"id, name, email, phone, tier" },
          { type: "orders" as const, file: ordersFile, ref: ordersRef, set: setOrdersFile, label:"orders.csv", hint:"id, customer_id, product, qty, price, order_date" },
        ].map(({ type, file, ref, set, label, hint }) => (
          <div key={type}
            className={`upload-zone ${dragging === type ? "dragging" : ""}`}
            style={{ padding:"20px 18px" }}
            onClick={() => ref.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(type); }}
            onDragLeave={() => setDragging(null)}
            onDrop={handleDrop(type)}
          >
            <input ref={ref} type="file" accept=".csv" style={{ display:"none" }} onChange={(e) => set(e.target.files?.[0] || null)} />
            {file ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
                <FileText size={16} color="var(--accent-green)" />
                <span style={{ color:"var(--accent-green)", fontWeight:600, fontSize:13 }}>{file.name}</span>
                <button onClick={(e) => { e.stopPropagation(); set(null); }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)" }}><X size={12} /></button>
              </div>
            ) : (
              <>
                <CloudUpload size={20} color="var(--text-muted)" style={{ margin:"0 auto 6px" }} />
                <div style={{ fontWeight:600, color:"var(--text-secondary)", fontSize:13 }}>{label}</div>
                <div style={{ fontSize:11.5, color:"var(--text-muted)", marginTop:2 }}>{hint}</div>
              </>
            )}
          </div>
        ))}

        {result && (
          <div style={{ padding:"10px 14px", borderRadius:"var(--radius-sm)", background: result.success ? "var(--accent-green-dim)" : "var(--accent-rose-dim)", border:`1px solid ${result.success ? "var(--accent-green)" : "var(--accent-rose)"}`, color: result.success ? "var(--accent-green)" : "var(--accent-rose)", fontSize:13, display:"flex", gap:8, alignItems:"center" }}>
            {result.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {result.success || result.error}
          </div>
        )}

        <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !customersFile || !ordersFile}>
          {uploading ? <><Clock size={14} /> Uploading…</> : <><Upload size={14} /> Upload & Process</>}
        </button>
      </div>
    </div>
  );
}

// ── Customer Detail Panel ──────────────────────────────────────────────────────
function CustomerDetail({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerDetail(customerId).then(setData).finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <div style={{ padding:32, textAlign:"center", color:"var(--text-muted)" }}>Loading…</div>;
  if (!data) return null;

  const c = data.customer;
  const orders = data.orders || [];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={onBack} className="icon-btn"><ArrowLeft size={14} /></button>
        <h3 style={{ fontSize:"1rem" }}>{c.name}</h3>
        <span className={`badge badge-${c.tier === "Gold" ? "amber" : c.tier === "Silver" ? "muted" : "muted"}`}>{c.tier}</span>
      </div>

      {/* Customer info grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
        {[
          { icon: <Mail size={13} />, label:"Email", value: c.email || "—" },
          { icon: <Phone size={13} />, label:"Phone", value: c.phone || "—" },
          { icon: <Award size={13} />, label:"Total Spend", value: `₹${(c.total_spend || 0).toLocaleString()}` },
          { icon: <ShoppingBag size={13} />, label:"Orders", value: c.order_count || 0 },
          { icon: <Calendar size={13} />, label:"Last Purchase", value: c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString("en-IN") : "—" },
          { icon: <Clock size={13} />, label:"Days Inactive", value: c.days_since_last_purchase != null ? `${c.days_since_last_purchase}d` : "—" },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{ background:"var(--bg-base)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"10px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, color:"var(--text-muted)", fontSize:11, marginBottom:4 }}>{icon} {label}</div>
            <div style={{ fontWeight:700, color:"var(--text-primary)", fontSize:13 }}>{String(value)}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div style={{ fontWeight:600, fontSize:12, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Recent Orders</div>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
        {orders.length === 0
          ? <div style={{ color:"var(--text-muted)", fontSize:13 }}>No orders found.</div>
          : orders.map((o: any) => (
            <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"var(--bg-base)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:13 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Package size={13} color="var(--text-muted)" />
                <span style={{ color:"var(--text-primary)", fontWeight:500 }}>{o.product}</span>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:700, color:"var(--text-primary)" }}>₹{(o.price * (o.qty || 1)).toLocaleString()}</div>
                <div style={{ fontSize:11, color:"var(--text-muted)" }}>{o.order_date ? new Date(o.order_date).toLocaleDateString("en-IN") : ""}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Customer/Order Modal ───────────────────────────────────────────────────────
function DataModal({ type, onClose }: { type: "customers" | "orders"; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const fetcher = type === "customers" ? fetchCustomers : fetchOrders;
    fetcher(debouncedSearch).then((r) => {
      setData(type === "customers" ? (r as any).customers : (r as any).orders);
      setTotal((r as any).total);
    }).finally(() => setLoading(false));
  }, [type, debouncedSearch]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)" }} />
      <div style={{ position:"relative", width:"90%", maxWidth:700, maxHeight:"80vh", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"var(--shadow-lg)" }}>
        {/* Modal header */}
        <div style={{ padding:"18px 24px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <h2 style={{ fontSize:"1.05rem" }}>{type === "customers" ? "All Customers" : "All Orders"}</h2>
            <p style={{ color:"var(--text-muted)", fontSize:12, marginTop:2 }}>{total.toLocaleString()} {type === "customers" ? "customers" : "orders"} total</p>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={14} /></button>
        </div>

        {/* Search */}
        <div style={{ padding:"12px 24px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
          <div style={{ position:"relative" }}>
            <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)" }} />
            <input
              type="text"
              placeholder={type === "customers" ? "Search name, email, phone, tier…" : "Search product…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft:32 }}
              autoFocus
            />
          </div>
        </div>

        {/* Content: list or detail */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 24px 24px" }}>
          {selectedId && type === "customers" ? (
            <CustomerDetail customerId={selectedId} onBack={() => setSelectedId(null)} />
          ) : loading ? (
            <div style={{ padding:32, textAlign:"center", color:"var(--text-muted)" }}>Loading…</div>
          ) : data.length === 0 ? (
            <div style={{ padding:32, textAlign:"center", color:"var(--text-muted)" }}>No results found.</div>
          ) : type === "customers" ? (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid var(--border)" }}>
                  {["Name", "Email", "Tier", "Spend", "Orders", "Inactive"].map((h) => (
                    <th key={h} style={{ textAlign:"left", padding:"8px 10px", color:"var(--text-muted)", fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom:"1px solid var(--border)", cursor:"pointer", transition:"background 0.15s" }}
                    onClick={() => setSelectedId(c.id)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding:"10px 10px", fontWeight:600, color:"var(--text-primary)" }}>{c.name}</td>
                    <td style={{ padding:"10px 10px", color:"var(--text-secondary)" }}>{c.email || "—"}</td>
                    <td style={{ padding:"10px 10px" }}>
                      <span style={{ color: TIER_COLORS[c.tier] || "var(--text-muted)", fontWeight:600, fontSize:12 }}>{c.tier}</span>
                    </td>
                    <td style={{ padding:"10px 10px", fontWeight:700, color:"var(--text-primary)" }}>₹{(c.total_spend||0).toLocaleString()}</td>
                    <td style={{ padding:"10px 10px", color:"var(--text-secondary)" }}>{c.order_count || 0}</td>
                    <td style={{ padding:"10px 10px", color: (c.days_since_last_purchase||0) >= 45 ? "var(--accent-rose)" : "var(--text-secondary)" }}>
                      {c.days_since_last_purchase != null ? `${c.days_since_last_purchase}d` : "—"}
                    </td>
                    <td style={{ padding:"10px 10px" }}><ChevronRight size={13} color="var(--text-muted)" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid var(--border)" }}>
                  {["Product", "Customer", "Tier", "Qty", "Price", "Date"].map((h) => (
                    <th key={h} style={{ textAlign:"left", padding:"8px 10px", color:"var(--text-muted)", fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((o: any, i: number) => (
                  <tr key={o.id || i} style={{ borderBottom:"1px solid var(--border)" }}>
                    <td style={{ padding:"10px 10px", fontWeight:600, color:"var(--text-primary)" }}>{o.product}</td>
                    <td style={{ padding:"10px 10px", color:"var(--text-secondary)" }}>{o.customers?.name || "—"}</td>
                    <td style={{ padding:"10px 10px" }}>
                      <span style={{ color: TIER_COLORS[o.customers?.tier] || "var(--text-muted)", fontWeight:600, fontSize:12 }}>{o.customers?.tier || "—"}</span>
                    </td>
                    <td style={{ padding:"10px 10px", color:"var(--text-secondary)" }}>{o.qty}</td>
                    <td style={{ padding:"10px 10px", fontWeight:700, color:"var(--text-primary)" }}>₹{((o.price||0)*(o.qty||1)).toLocaleString()}</td>
                    <td style={{ padding:"10px 10px", color:"var(--text-muted)", fontSize:12 }}>{o.order_date ? new Date(o.order_date).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: stats, error, mutate, isLoading } = useSWR<StatsResponse>("stats", fetchStats, { refreshInterval: 0 });
  const { user } = useCurrentUser();
  const [modal, setModal] = useState<"customers" | "orders" | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const companyName = user?.company_name || "your company";

  const statCards = stats ? [
    { label:"Total Customers", value:stats.customer_count.toLocaleString(), sub:`${stats.inactive_count} inactive (45+ days)`, icon:Users, color:"var(--accent-violet)", modalType:"customers" as const },
    { label:"Total Orders", value:stats.order_count.toLocaleString(), sub:"Across all customers", icon:ShoppingBag, color:"var(--accent-blue)", modalType:"orders" as const },
    { label:"Total Revenue", value:`₹${(stats.total_revenue/1000).toFixed(1)}K`, sub:"Lifetime spend", icon:DollarSign, color:"var(--accent-green)", modalType:null },
    { label:"Avg Spend", value:`₹${stats.average_spend.toLocaleString()}`, sub:`${stats.premium_inactive_count} premium inactive`, icon:TrendingUp, color:"var(--accent-amber)", modalType:null },
  ] : [];

  return (
    <div className="page-content-wide">
      {/* Header */}
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="page-title">Dashboard</div>
            <span className="tag">Live</span>
          </div>
          <p className="page-subtitle">Your {companyName} customer data at a glance.</p>
        </div>
        <button id="import-data-btn" className="btn btn-secondary btn-sm" onClick={() => setUploadOpen(true)} style={{ marginTop:4 }}>
          <Upload size={13} /> Import Data
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom:28 }}>
        {isLoading
          ? Array.from({ length:4 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ height:12, width:"60%", marginBottom:8 }} />
                <div className="skeleton" style={{ height:32, width:"80%" }} />
                <div className="skeleton" style={{ height:10, width:"50%", marginTop:4 }} />
              </div>
            ))
          : statCards.map(({ label, value, sub, icon:Icon, color, modalType }) => (
              <div
                key={label}
                className="stat-card"
                style={{ "--accent-color":color, cursor: modalType ? "pointer" : "default" } as React.CSSProperties}
                onClick={() => modalType && setModal(modalType)}
                title={modalType ? `Click to view all ${modalType}` : undefined}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon size={18} color={color} />
                  </div>
                  {modalType && <ChevronRight size={14} color="var(--text-muted)" />}
                </div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
                <div className="stat-sub">{sub}</div>
              </div>
            ))}
      </div>

      {/* Bottom row: Top Products + Tier Breakdown */}
      <div className="grid-2" style={{ marginBottom:28 }}>
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Star size={15} style={{ display:"inline", marginRight:7, verticalAlign:"middle", color:"var(--accent-amber)" }} />
              Top Products
            </h3>
          </div>
          {!stats?.top_products?.length ? (
            <div className="empty-state" style={{ padding:"24px 0" }}>
              <ShoppingBag size={28} color="var(--text-muted)" />
              <span>No product data yet</span>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {stats.top_products.map((p, i) => {
                const maxRev = stats.top_products[0]?.revenue || 1;
                return (
                  <div key={p.product}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:13 }}>
                      <span style={{ color:"var(--text-secondary)", fontWeight:500 }}>{i+1}. {p.product}</span>
                      <span style={{ color:"var(--text-primary)", fontWeight:700 }}>₹{(p.revenue/1000).toFixed(1)}K</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${(p.revenue/maxRev)*100}%`, "--accent-color":"var(--accent-amber)" } as React.CSSProperties} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Audience Tiers</h3>
          </div>
          {!stats?.tier_breakdown ? (
            <div className="empty-state" style={{ padding:"24px 0" }}>
              <Users size={24} color="var(--text-muted)" />
              <span>No data yet</span>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", gap:12, marginBottom:20 }}>
                {Object.entries(stats.tier_breakdown).map(([tier, count]) => (
                  <div key={tier} style={{ flex:1, padding:"16px 12px", background:"var(--bg-base)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", textAlign:"center", cursor:"pointer" }}
                    onClick={() => setModal("customers")}
                  >
                    <div style={{ fontSize:22, fontWeight:800, color:TIER_COLORS[tier]||"var(--text-primary)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{count}</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:4, fontWeight:600 }}>{tier}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {Object.entries(stats.tier_breakdown).map(([tier, count]) => {
                  const total = Object.values(stats.tier_breakdown).reduce((a, b) => a + b, 0);
                  return (
                    <div key={tier}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12 }}>
                        <span style={{ color:TIER_COLORS[tier]||"var(--text-secondary)", fontWeight:600 }}>{tier}</span>
                        <span style={{ color:"var(--text-muted)" }}>{total > 0 ? Math.round((count/total)*100) : 0}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: total > 0 ? `${(count/total)*100}%` : "0%", "--accent-color":TIER_COLORS[tier]||"var(--accent-violet)" } as React.CSSProperties} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error state — only show if backend truly unavailable */}
      {error && (
        stats === undefined && (
          <div style={{
            border: "1px dashed var(--accent-violet)",
            borderRadius: "var(--radius)",
            padding: "48px 32px",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(124,92,252,0.04), rgba(77,166,255,0.04))",
            marginBottom: 24,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: "linear-gradient(135deg, rgba(124,92,252,0.15), rgba(77,166,255,0.15))",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <CloudUpload size={32} color="var(--accent-violet)" />
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 10 }}>
              Welcome to Reachly, {companyName}! 👋
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
              Your workspace is ready. Start by importing your customer and orders data to unlock AI-powered campaigns, insights, and analytics.
            </p>
            <button
              id="get-started-import-btn"
              className="btn btn-primary"
              onClick={() => setUploadOpen(true)}
              style={{ fontSize: 14, padding: "12px 28px" }}
            >
              <CloudUpload size={15} /> Import Customer Data
            </button>
            <p style={{ marginTop: 16, color: "var(--text-muted)", fontSize: 12 }}>
              Upload customers.csv + orders.csv to get started
            </p>
          </div>
        )
      )}

      {/* Upload drawer */}
      <UploadDrawer open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={() => { mutate(); setUploadOpen(false); }} />

      {/* Data modal */}
      {modal && <DataModal type={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
