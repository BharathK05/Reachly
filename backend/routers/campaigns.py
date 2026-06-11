import os
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from db.client import get_supabase
from models.schemas import CampaignCreate
from agents.orchestrator import run_campaign
from ai_client import generate

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

CHANNEL_SERVICE_URL = os.environ.get("CHANNEL_SERVICE_URL", "http://localhost:8001")


@router.get("")
async def list_campaigns():
    """Return all campaigns ordered by newest first."""
    supabase = get_supabase()
    try:
        result = supabase.table("campaigns").select("id, name, goal, budget, status, channel, audience_size, estimated_cost, created_at").order("created_at", desc=True).execute()
        return {"campaigns": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list campaigns: {e}")


@router.post("")
async def create_campaign(body: CampaignCreate):
    """Create a campaign row in draft status, return campaign ID."""
    supabase = get_supabase()
    try:
        result = supabase.table("campaigns").insert({
            "goal": body.goal,
            "budget": body.budget,
            "name": body.name or None,
            "status": "draft",
        }).execute()
        campaign = result.data[0]
        return {"id": campaign["id"], "status": campaign["status"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {e}")


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign and all its logs/events (cascade)."""
    supabase = get_supabase()
    try:
        supabase.table("campaigns").delete().eq("id", campaign_id).execute()
        return {"deleted": campaign_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete campaign: {e}")


@router.get("/{campaign_id}/run")
async def run_campaign_sse(campaign_id: str):
    """SSE endpoint — fetch campaign, run orchestrator, stream agent events."""
    supabase = get_supabase()
    try:
        result = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()
        campaign = result.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Campaign not found: {e}")

    goal = campaign["goal"]
    budget = float(campaign["budget"])

    return StreamingResponse(
        run_campaign(campaign_id, goal, budget),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/{campaign_id}/approve")
async def approve_campaign(campaign_id: str):
    """Set campaign to approved, dispatch to channel service."""
    supabase = get_supabase()

    try:
        result = supabase.table("campaigns").update({"status": "approved"}).eq("id", campaign_id).execute()
        campaign = result.data[0] if result.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve campaign: {e}")

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Fetch audience customer IDs
    try:
        audience_size = campaign.get("audience_size", 0) or 0
        audience_criteria = campaign.get("audience_criteria") or {}

        # Re-query audience
        query = supabase.table("customers").select("id, name")
        if audience_criteria.get("total_spend_min"):
            query = query.gte("total_spend", audience_criteria["total_spend_min"])
        if audience_criteria.get("days_since_min"):
            query = query.gte("days_since_last_purchase", audience_criteria["days_since_min"])
        if audience_criteria.get("tier"):
            query = query.eq("tier", audience_criteria["tier"])

        customers_res = query.limit(audience_size).execute()
        customers = customers_res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch audience: {e}")

    channel = campaign.get("channel", "Email")

    # Insert communication logs
    try:
        logs = []
        for c in customers:
            log_res = supabase.table("communication_logs").insert({
                "campaign_id": campaign_id,
                "customer_id": c["id"],
                "customer_name": c["name"],
                "channel": channel,
                "status": "pending",
            }).execute()
            if log_res.data:
                logs.append(log_res.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create logs: {e}")

    # Build recipient list for channel service
    recipients = [
        {"log_id": log["id"], "customer_name": log["customer_name"], "channel": log["channel"]}
        for log in logs
    ]

    callback_url = os.environ.get("CRM_CALLBACK_URL", "http://localhost:8000/api/events/callback")

    # Fire and forget dispatch to channel service
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{CHANNEL_SERVICE_URL}/send",
                json={
                    "campaign_id": campaign_id,
                    "recipients": recipients,
                    "callback_url": callback_url,
                },
            )
    except Exception:
        pass  # Channel service is fire-and-forget

    return {"status": "approved", "dispatched": len(recipients)}


@router.get("/{campaign_id}/monitor")
async def monitor_campaign(campaign_id: str):
    """Return all communication logs + summary counts for a campaign."""
    supabase = get_supabase()
    try:
        logs_res = supabase.table("communication_logs").select("*").eq("campaign_id", campaign_id).execute()
        logs = logs_res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {e}")

    summary = {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "failed": 0, "pending": 0}
    for log in logs:
        status = log.get("status", "pending")
        if status in summary:
            summary[status] += 1
        else:
            summary["pending"] += 1

    return {"logs": logs, "summary": summary}


@router.post("/{campaign_id}/insights")
async def generate_insights(campaign_id: str):
    """Generate natural language insights from campaign results using Gemini."""
    supabase = get_supabase()

    try:
        campaign_res = supabase.table("campaigns").select("*").eq("id", campaign_id).single().execute()
        campaign = campaign_res.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Campaign not found: {e}")

    try:
        logs_res = supabase.table("communication_logs").select("*").eq("campaign_id", campaign_id).execute()
        logs = logs_res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {e}")

    summary = {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "failed": 0}
    for log in logs:
        status = log.get("status", "pending")
        if status in summary:
            summary[status] += 1

    predictions = campaign.get("predictions") or {}

    prompt = f"""
You are a senior CRM analyst for Starbucks India.
Analyze this campaign and write a structured markdown report.

## Campaign Details
- Goal: {campaign.get('goal')}
- Channel: {campaign.get('channel')}
- Budget: ₹{campaign.get('budget')}
- Audience Size: {campaign.get('audience_size')}
- Estimated Cost: ₹{campaign.get('estimated_cost')}

## Predicted Metrics
- Open Rate: {predictions.get('open_rate', 'N/A')}
- CTR: {predictions.get('ctr', 'N/A')}
- Conversion Rate: {predictions.get('conversion_rate', 'N/A')}
- Estimated Conversions: {predictions.get('estimated_conversions', 'N/A')}

## Actual Delivery Results
- Sent: {summary['sent']}
- Delivered: {summary['delivered']}
- Opened: {summary['opened']}
- Clicked: {summary['clicked']}
- Failed: {summary['failed']}

Write a 4-section markdown report:
1. **Executive Summary** (2-3 sentences)
2. **Performance Analysis** (compare predicted vs actual, with % figures)
3. **Key Insights** (3 bullet points)
4. **Recommendations** (2-3 actionable next steps for Starbucks India)

Use proper markdown headings, bullet points, and bold text for numbers.
"""

    try:
        insights = generate(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {e}")

    return {
        "insights": insights,
        "campaign_snapshot": {
            "goal": campaign.get("goal"),
            "channel": campaign.get("channel"),
            "budget": campaign.get("budget"),
            "audience_size": campaign.get("audience_size"),
            "estimated_cost": campaign.get("estimated_cost"),
            "predictions": predictions,
            "actual": summary,
        },
    }
