from pydantic import BaseModel
from typing import Optional, Any
import uuid


# ─── Campaign ────────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    goal: str
    budget: float
    name: Optional[str] = None


class CampaignResponse(BaseModel):
    id: str
    goal: str
    budget: float
    status: str
    channel: Optional[str] = None
    audience_size: Optional[int] = None
    message: Optional[str] = None
    predictions: Optional[dict] = None
    estimated_cost: Optional[float] = None
    created_at: Optional[str] = None


# ─── Data Upload ──────────────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    customer_count: int
    order_count: int
    total_revenue: float
    average_spend: float
    inactive_count: int
    premium_inactive_count: int


# ─── Events / Callback ───────────────────────────────────────────────────────

class EventCallback(BaseModel):
    log_id: str
    event_type: str  # sent | delivered | opened | clicked | failed


# ─── Monitor ─────────────────────────────────────────────────────────────────

class CommunicationLog(BaseModel):
    id: str
    campaign_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    channel: Optional[str] = None
    status: str
    sent_at: Optional[str] = None


class MonitorResponse(BaseModel):
    logs: list[CommunicationLog]
    summary: dict[str, int]
