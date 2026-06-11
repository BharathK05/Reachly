// All TypeScript types for Reachly API responses

export interface StatsResponse {
  customer_count: number;
  order_count: number;
  total_revenue: number;
  average_spend: number;
  inactive_count: number;
  premium_inactive_count: number;
  top_products: { product: string; revenue: number }[];
  tier_breakdown: Record<string, number>;
}

export interface Campaign {
  id: string;
  name?: string;
  goal: string;
  budget: number;
  status: string;
  channel?: string;
  audience_size?: number;
  message?: string;
  predictions?: Predictions;
  estimated_cost?: number;
  created_at?: string;
}

export interface Predictions {
  open_rate: number;
  ctr: number;
  conversion_rate: number;
  estimated_conversions: number;
  reasoning: string;
}

export interface AgentEvent {
  step: string;
  status: "active" | "done" | "error" | "waiting";
  output?: string;
  audience_size?: number;
  discount_code?: string;
  channel?: string;
  estimated_cost?: number;
  final_audience_size?: number;
  predictions?: Predictions;
  summary?: ApprovalSummary;
  customer_ids?: string[];
  customer_names?: Record<string, string>;
}

export interface ApprovalSummary {
  campaign_type: string;
  channel: string;
  audience_size: number;
  estimated_cost: number;
  message: string;
  discount_code: string;
  predictions: Predictions;
}

export interface CommunicationLog {
  id: string;
  campaign_id: string;
  customer_id?: string;
  customer_name?: string;
  channel?: string;
  status: string;
  sent_at?: string;
}

export interface MonitorResponse {
  logs: CommunicationLog[];
  summary: Record<string, number>;
}

export interface InsightsResponse {
  insights: string;
  campaign_snapshot: {
    goal: string;
    channel: string;
    budget: number;
    audience_size: number;
    estimated_cost: number;
    predictions: Predictions;
    actual: Record<string, number>;
  };
}

export interface UploadResponse {
  message: string;
  customers_processed: number;
  orders_processed: number;
}
