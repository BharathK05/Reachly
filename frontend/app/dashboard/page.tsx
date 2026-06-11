"use client";

import { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Upload,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Star,
  X,
  FileText,
} from "lucide-react";
import { fetchStats, uploadData } from "@/lib/api";
import type { StatsResponse } from "@/lib/types";

const TIER_COLORS: Record<string, string> = {
  Gold: "var(--accent-amber)",
  Silver: "var(--text-secondary)",
  Bronze: "#cd7f32",
};

export default function DashboardPage() {
  const { data: stats, error, mutate, isLoading } = useSWR<StatsResponse>(
    "stats",
    fetchStats,
    { refreshInterval: 0 }
  );

  const [customersFile, setCustomersFile] = useState<File | null>(null);
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success?: string;
    error?: string;
  } | null>(null);
  const [dragging, setDragging] = useState<"customers" | "orders" | null>(null);

  const customersInputRef = useRef<HTMLInputElement>(null);
  const ordersInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!customersFile || !ordersFile) {
      setUploadResult({ error: "Please select both customers.csv and orders.csv files." });
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await uploadData(customersFile, ordersFile);
      setUploadResult({
        success: `✓ ${result.customers_processed} customers and ${result.orders_processed} orders uploaded successfully.`,
      });
      setCustomersFile(null);
      setOrdersFile(null);
      mutate(); // Refresh stats
    } catch (err: any) {
      setUploadResult({ error: err.message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (type: "customers" | "orders") =>
      (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(null);
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith(".csv")) {
          if (type === "customers") setCustomersFile(file);
          else setOrdersFile(file);
        }
      },
    []
  );

  const statCards = stats
    ? [
        {
          label: "Total Customers",
          value: stats.customer_count.toLocaleString(),
          sub: `${stats.inactive_count} inactive (45+ days)`,
          icon: Users,
          color: "var(--accent-violet)",
        },
        {
          label: "Total Orders",
          value: stats.order_count.toLocaleString(),
          sub: "Across all customers",
          icon: ShoppingBag,
          color: "var(--accent-blue)",
        },
        {
          label: "Total Revenue",
          value: `₹${(stats.total_revenue / 1000).toFixed(1)}K`,
          sub: "Lifetime spend",
          icon: DollarSign,
          color: "var(--accent-green)",
        },
        {
          label: "Avg Spend",
          value: `₹${stats.average_spend.toLocaleString()}`,
          sub: `${stats.premium_inactive_count} premium inactive`,
          icon: TrendingUp,
          color: "var(--accent-amber)",
        },
      ]
    : [];

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="page-title">Dashboard</div>
          <span className="tag">Live</span>
        </div>
        <p className="page-subtitle">
          Your Starbucks India customer data at a glance. Upload your dataset to get started.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 32, width: "80%" }} />
                <div className="skeleton" style={{ height: 10, width: "50%", marginTop: 4 }} />
              </div>
            ))
          : statCards.map(({ label, value, sub, icon: Icon, color }) => (
              <div
                key={label}
                className="stat-card"
                style={{ "--accent-color": color } as React.CSSProperties}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Icon size={18} color={color} />
                </div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
                <div className="stat-sub">{sub}</div>
              </div>
            ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* Upload Section */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Upload size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
              Upload Dataset
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Customers Drop Zone */}
            <div
              className={`upload-zone ${dragging === "customers" ? "dragging" : ""}`}
              style={{ padding: "20px 24px" }}
              onClick={() => customersInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging("customers"); }}
              onDragLeave={() => setDragging(null)}
              onDrop={handleDrop("customers")}
              role="button"
              tabIndex={0}
              aria-label="Upload customers CSV"
              id="customers-upload-zone"
            >
              <input
                ref={customersInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => setCustomersFile(e.target.files?.[0] || null)}
                id="customers-file-input"
              />
              {customersFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <FileText size={18} color="var(--accent-green)" />
                  <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>{customersFile.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCustomersFile(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                    aria-label="Remove customers file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <CloudUpload size={24} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    customers.csv
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Columns: id, name, email, phone, tier
                  </div>
                </>
              )}
            </div>

            {/* Orders Drop Zone */}
            <div
              className={`upload-zone ${dragging === "orders" ? "dragging" : ""}`}
              style={{ padding: "20px 24px" }}
              onClick={() => ordersInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging("orders"); }}
              onDragLeave={() => setDragging(null)}
              onDrop={handleDrop("orders")}
              role="button"
              tabIndex={0}
              aria-label="Upload orders CSV"
              id="orders-upload-zone"
            >
              <input
                ref={ordersInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => setOrdersFile(e.target.files?.[0] || null)}
                id="orders-file-input"
              />
              {ordersFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <FileText size={18} color="var(--accent-green)" />
                  <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>{ordersFile.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOrdersFile(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                    aria-label="Remove orders file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <CloudUpload size={24} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    orders.csv
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Columns: id, customer_id, product, qty, price, order_date
                  </div>
                </>
              )}
            </div>

            {uploadResult && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: uploadResult.success
                    ? "var(--accent-green-dim)"
                    : "var(--accent-rose-dim)",
                  border: `1px solid ${uploadResult.success ? "var(--accent-green)" : "var(--accent-rose)"}22`,
                  fontSize: 13,
                  color: uploadResult.success ? "var(--accent-green)" : "var(--accent-rose)",
                }}
              >
                {uploadResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {uploadResult.success || uploadResult.error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading || !customersFile || !ordersFile}
              id="upload-submit-btn"
              style={{ width: "100%" }}
            >
              {uploading ? (
                <>
                  <Clock size={15} />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Upload & Process Data
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column: Top Products + Tier Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top Products */}
          <div className="card" style={{ flex: 1 }}>
            <div className="section-header">
              <h3 className="section-title">
                <Star size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "middle", color: "var(--accent-amber)" }} />
                Top Products
              </h3>
            </div>
            {!stats?.top_products?.length ? (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <ShoppingBag size={28} color="var(--text-muted)" />
                <span>No product data yet</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stats.top_products.map((p, i) => {
                  const maxRev = stats.top_products[0]?.revenue || 1;
                  const pct = (p.revenue / maxRev) * 100;
                  return (
                    <div key={p.product}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                          {i + 1}. {p.product}
                        </span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                          ₹{(p.revenue / 1000).toFixed(1)}K
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            "--accent-color": "var(--accent-amber)",
                          } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tier Breakdown */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">Audience Tiers</h3>
            </div>
            {!stats?.tier_breakdown ? (
              <div className="empty-state" style={{ padding: "16px 0" }}>
                <Users size={24} color="var(--text-muted)" />
                <span>No data yet</span>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                {Object.entries(stats.tier_breakdown).map(([tier, count]) => (
                  <div
                    key={tier}
                    style={{
                      flex: 1,
                      padding: "16px 12px",
                      background: "var(--bg-base)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: TIER_COLORS[tier] || "var(--text-primary)",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      {count}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
                      {tier}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--accent-rose-dim)",
            border: "1px solid var(--accent-rose)22",
            borderRadius: "var(--radius-sm)",
            color: "var(--accent-rose)",
            fontSize: 13,
          }}
        >
          <AlertCircle size={14} style={{ display: "inline", marginRight: 6 }} />
          Failed to load stats. Make sure the backend is running.
        </div>
      )}
    </div>
  );
}
