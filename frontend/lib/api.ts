// All API call functions — never use raw fetch outside this file
// Always reads base URL from process.env.NEXT_PUBLIC_API_URL

import type {
  StatsResponse,
  Campaign,
  MonitorResponse,
  InsightsResponse,
  UploadResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Data ─────────────────────────────────────────────────────────────────────

export async function uploadData(
  customersFile: File,
  ordersFile: File
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("customers_file", customersFile);
  form.append("orders_file", ordersFile);

  const res = await fetch(`${BASE_URL}/api/data/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${BASE_URL}/api/data/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function listCampaigns(): Promise<{ campaigns: Campaign[] }> {
  const res = await fetch(`${BASE_URL}/api/campaigns`);
  if (!res.ok) throw new Error("Failed to list campaigns");
  return res.json();
}

export async function createCampaign(
  goal: string,
  budget: number,
  name?: string
): Promise<{ id: string; status: string }> {
  const res = await fetch(`${BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal, budget, name: name || null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to create campaign");
  }
  return res.json();
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to delete campaign");
  }
}

export function getCampaignSSEUrl(campaignId: string): string {
  return `${BASE_URL}/api/campaigns/${campaignId}/run`;
}

export async function approveCampaign(campaignId: string): Promise<{ status: string; dispatched: number }> {
  const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/approve`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to approve campaign");
  }
  return res.json();
}

export async function fetchMonitor(campaignId: string): Promise<MonitorResponse> {
  const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/monitor`);
  if (!res.ok) throw new Error("Failed to fetch monitor data");
  return res.json();
}

export async function generateInsights(campaignId: string): Promise<InsightsResponse> {
  const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/insights`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to generate insights");
  }
  return res.json();
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function fetchCustomers(search = "", limit = 100, offset = 0) {
  const params = new URLSearchParams({ search, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${BASE_URL}/api/data/customers?${params}`);
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json() as Promise<{ customers: Record<string, unknown>[]; total: number }>;
}

export async function fetchCustomerDetail(customerId: string) {
  const res = await fetch(`${BASE_URL}/api/data/customers/${customerId}`);
  if (!res.ok) throw new Error("Failed to fetch customer");
  return res.json();
}

export async function fetchOrders(search = "", limit = 100, offset = 0) {
  const params = new URLSearchParams({ search, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${BASE_URL}/api/data/orders?${params}`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json() as Promise<{ orders: Record<string, unknown>[]; total: number }>;
}

