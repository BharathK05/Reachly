import os
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from db.client import get_supabase
from models.schemas import CampaignCreate
from agents.orchestrator import run_campaign
from ai_client import generate
from auth_utils import get_tenant_from_cookie

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

CHANNEL_SERVICE_URL = os.environ.get("CHANNEL_SERVICE_URL", "http://localhost:8001")


@router.get("")
async def list_campaigns(request: Request):
    """Return all campaigns for the current tenant, ordered by newest first."""
    tenant = get_tenant_from_cookie(request)
    supabase = get_supabase()
    try:
        result = supabase.table("campaigns").select(
            "id, name, goal, budget, status, channel, audience_size, estimated_cost, created_at"
        ).eq("tenant_id", tenant["tenant_id"]).order("created_at", desc=True).execute()
        return {"campaigns": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list campaigns: {e}")


@router.post("")
async def create_campaign(body: CampaignCreate, request: Request):
    """Create a campaign row in draft status, return campaign ID."""
    tenant = get_tenant_from_cookie(request)
    supabase = get_supabase()
    try:
        result = supabase.table("campaigns").insert({
            "goal": body.goal,
            "budget": body.budget,
            "name": body.name or None,
            "status": "draft",
            "tenant_id": tenant["tenant_id"],
        }).execute()
        campaign = result.data[0]
        return {"id": campaign["id"], "status": campaign["status"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {e}")


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, request: Request):
    """Delete a campaign and all its logs/events (cascade)."""
    tenant = get_tenant_from_cookie(request)
    supabase = get_supabase()
    try:
        supabase.table("campaigns").delete().eq("id", campaign_id).eq(
            "tenant_id", tenant["tenant_id"]
        ).execute()
        return {"deleted": campaign_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete campaign: {e}")


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, request: Request):
    """Return a single campaign's full data (for timeline cache load)."""
    tenant = get_tenant_from_cookie(request)
    supabase = get_supabase()
    try:
        result = supabase.table("campaigns").select("*").eq("id", campaign_id).eq(
            "tenant_id", tenant["tenant_id"]
        ).single().execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Campaign not found: {e}")


@router.get("/{campaign_id}/run")
async def run_campaign_sse(campaign_id: str, request: Request):
    """SSE endpoint — fetch campaign, run orchestrator, stream agent events."""
    tenant = get_tenant_from_cookie(request)
    supabase = get_supabase()
    try:
        result = supabase.table("campaigns").select("*").eq("id", campaign_id).eq(
            "tenant_id", tenant["tenant_id"]
        ).single().execute()
        campaign = result.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Campaign not found: {e}")

    goal = campaign["goal"]
    budget = float(campaign["budget"])
    company_name = tenant["company_name"]
    tenant_id = tenant["tenant_id"]

    return StreamingResponse(
        run_campaign(campaign_id, goal, budget, company_name=company_name, tenant_id=tenant_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/{campaign_id}/approve")
async def approve_campaign(campaign_id: str, request: Request):
    """Set campaign to approved, dispatch to channel service."""
    tenant = get_tenant_from_cookie(request)
    tenant_id = tenant["tenant_id"]
    supabase = get_supabase()

    try:
        result = supabase.table("campaigns").update({"status": "approved"}).eq("id", campaign_id).eq(
            "tenant_id", tenant_id
        ).execute()
        campaign = result.data[0] if result.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve campaign: {e}")

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Fetch audience customer IDs
    try:
        audience_size = campaign.get("audience_size", 0) or 0
        audience_criteria = campaign.get("audience_criteria") or {}

        query = supabase.table("customers").select("id, name").eq("tenant_id", tenant_id)
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

    recipients = [
        {"log_id": log["id"], "customer_name": log["customer_name"], "channel": log["channel"]}
        for log in logs
    ]

    callback_url = os.environ.get("CRM_CALLBACK_URL", "http://localhost:8000/api/events/callback")

    channel_error = None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{CHANNEL_SERVICE_URL}/send",
                json={
                    "campaign_id": campaign_id,
                    "recipients": recipients,
                    "callback_url": callback_url,
                },
            )
            if resp.status_code >= 400:
                channel_error = f"Channel service returned {resp.status_code}"
    except Exception as e:
        channel_error = str(e)

    return {
        "status": "approved",
        "dispatched": len(recipients),
        "channel_service_ok": channel_error is None,
        "channel_error": channel_error,
    }


@router.get("/{campaign_id}/monitor")
async def monitor_campaign(campaign_id: str, request: Request):
    """Return all communication logs + summary counts for a campaign."""
    tenant = get_tenant_from_cookie(request)
    supabase = get_supabase()
    # Verify the campaign belongs to this tenant
    try:
        supabase.table("campaigns").select("id").eq("id", campaign_id).eq(
            "tenant_id", tenant["tenant_id"]
        ).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        logs_res = supabase.table("communication_logs").select("*").eq("campaign_id", campaign_id).execute()
        logs = logs_res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {e}")

    summary = {
        "sent": 0, "delivered": 0, "read": 0,
        "opened": 0, "clicked": 0, "converted": 0,
        "failed": 0, "pending": 0
    }
    for log in logs:
        status = log.get("status", "pending")
        if status in summary:
            summary[status] += 1
        else:
            summary["pending"] += 1

    return {"logs": logs, "summary": summary}


@router.get("/{campaign_id}/insights")
async def get_cached_insights(campaign_id: str, request: Request):
    """Return cached insights if they exist."""
    tenant = get_tenant_from_cookie(request)
    company_name = tenant["company_name"]
    supabase = get_supabase()
    try:
        res = supabase.table("campaigns").select(
            "insights_cache, goal, channel, budget, audience_size, estimated_cost, predictions"
        ).eq("id", campaign_id).eq("tenant_id", tenant["tenant_id"]).single().execute()
        campaign = res.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Campaign not found: {e}")

    if not campaign.get("insights_cache"):
        return {"cached": False, "insights": None, "campaign_snapshot": None}

    try:
        logs_res = supabase.table("communication_logs").select("status").eq("campaign_id", campaign_id).execute()
        logs = logs_res.data or []
    except Exception:
        logs = []

    summary = {"sent": 0, "delivered": 0, "read": 0, "opened": 0, "clicked": 0, "converted": 0, "failed": 0}
    for log in logs:
        s = log.get("status", "pending")
        if s in summary:
            summary[s] += 1

    predictions = campaign.get("predictions") or {}

    raw_insights = campaign.get("insights_cache") or ""
    next_rec = ""
    cleaned_insights = ""
    if raw_insights:
        if "[NEXT_REC]" in raw_insights:
            parts = raw_insights.split("[NEXT_REC]")
            cleaned_insights = parts[0].strip()
            next_rec = parts[1].strip()
        else:
            cleaned_insights = raw_insights

    if cleaned_insights and not next_rec:
        rec_prompt = f"""
You are a CRM strategist for {company_name}.
Based on these campaign results:
- Goal: {campaign.get('goal')}
- Sent: {summary['sent']}, Delivered: {summary['delivered']}, Opened: {summary['opened']}
- Clicked: {summary['clicked']}, Converted: {summary['converted']}, Failed: {summary['failed']}

Provide a single, concrete, highly actionable next campaign recommendation (1-2 sentences).
Do not write markdown headers, intro, or quotes. Just return the raw text.
"""
        try:
            next_rec = generate(rec_prompt)
            full_text = f"{cleaned_insights}\n\n[NEXT_REC]\n{next_rec}\n[NEXT_REC]"
            supabase.table("campaigns").update({"insights_cache": full_text}).eq("id", campaign_id).execute()
        except Exception:
            next_rec = "Based on results, consider a follow-up offer for engaged clickers."

    return {
        "cached": True,
        "insights": cleaned_insights,
        "next_campaign_recommendation": next_rec or None,
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


@router.post("/{campaign_id}/insights")
async def generate_insights(campaign_id: str, request: Request):
    """Generate natural language insights and cache them in the DB."""
    tenant = get_tenant_from_cookie(request)
    company_name = tenant["company_name"]
    supabase = get_supabase()

    try:
        campaign_res = supabase.table("campaigns").select("*").eq("id", campaign_id).eq(
            "tenant_id", tenant["tenant_id"]
        ).single().execute()
        campaign = campaign_res.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Campaign not found: {e}")

    try:
        logs_res = supabase.table("communication_logs").select("status").eq("campaign_id", campaign_id).execute()
        logs = logs_res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {e}")

    summary = {"sent": 0, "delivered": 0, "read": 0, "opened": 0, "clicked": 0, "converted": 0, "failed": 0}
    for log in logs:
        status = log.get("status", "pending")
        if status in summary:
            summary[status] += 1

    predictions = campaign.get("predictions") or {}

    sent = summary.get('sent', 0) or 1
    delivered = summary.get('delivered', 0)
    opened = summary.get('opened', 0)
    clicked = summary.get('clicked', 0)
    converted = summary.get('converted', 0)

    actual_open_rate = opened / sent if sent else 0
    actual_ctr = clicked / sent if sent else 0
    actual_conversion_rate = converted / clicked if clicked else (converted / sent if sent else 0)

    pred_open = predictions.get('open_rate', 0)
    pred_ctr = predictions.get('ctr', 0)
    pred_conv = predictions.get('conversion_rate', 0)
    pred_est_conv = predictions.get('estimated_conversions', 0)

    def format_pct(v):
        return f"{round(v * 100)}%"

    def calculate_variance_str(actual, predicted):
        diff = actual - predicted
        sign = "+" if diff >= 0 else ""
        return f"{sign}{round(diff * 100)}%"

    var_open = calculate_variance_str(actual_open_rate, pred_open)
    var_ctr = calculate_variance_str(actual_ctr, pred_ctr)
    var_conv = calculate_variance_str(actual_conversion_rate, pred_conv)

    diff_conversions = converted - pred_est_conv
    var_conversions = f"+{diff_conversions}" if diff_conversions >= 0 else str(diff_conversions)

    prompt = f"""
You are a senior CRM analyst for {company_name}.
Analyze the following campaign and write a structured performance report using the EXACT template below.

Do not add any preamble, conversational text, or wrapper. Start directly with the first header (# Campaign Performance Report).

## Campaign Details
- Goal: {campaign.get('goal')}
- Channel: {campaign.get('channel')}
- Budget: ₹{campaign.get('budget')}
- Audience Size: {campaign.get('audience_size')}
- Estimated Cost: ₹{campaign.get('estimated_cost')}

## Predicted Metrics
- Open Rate: {format_pct(pred_open)}
- CTR: {format_pct(pred_ctr)}
- Conversion Rate: {format_pct(pred_conv)}
- Estimated Conversions: {pred_est_conv}

## Actual Delivery Results
- Sent: {summary['sent']}
- Delivered: {summary['delivered']}
- Read: {summary['read']}
- Opened: {summary['opened']}
- Clicked: {summary['clicked']}
- Converted (attributed orders): {summary['converted']}
- Failed: {summary['failed']}

---
TEMPLATE TO USE (fill in the bracketed values with your analysis):

# Campaign Performance Report

## 1. Executive Summary
[Write 2 sentences summarizing the overall campaign delivery status and overall success here.]

## 2. Performance Analysis
| Metric | Predicted | Actual | Variance |
| :--- | :--- | :--- | :--- |
| Open Rate | {format_pct(pred_open)} | {format_pct(actual_open_rate)} | {var_open} |
| Click-Through Rate (CTR) | {format_pct(pred_ctr)} | {format_pct(actual_ctr)} | {var_ctr} |
| Conversion Rate | {format_pct(pred_conv)} | {format_pct(actual_conversion_rate)} | {var_conv} |
| Total Conversions | {pred_est_conv} | {converted} | {var_conversions} |

[Write 2 sentences explaining the variance between the predicted vs actual delivery metrics and conversions.]

## 3. Key Performance Insights
* **Delivery Performance:** [1 sentence analysis about delivery status, success rate, and failed communications]
* **Engagement Quality:** [1 sentence analysis about click-through and reading engagement]
* **Conversion Attribution:** [1 sentence analysis about attributed orders, order value, or revenue impact]

## 4. Strategic Recommendations
* **Audience Refinement:** [Actionable step to refine or expand the target audience based on results]
* **Channel Optimization:** [Actionable step to improve messaging content, delivery timing, or channel split]
"""

    try:
        insights = generate(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {e}")

    rec_prompt = f"""
You are a CRM strategist for {company_name}.
Based on these campaign results:
- Goal: {campaign.get('goal')}
- Sent: {summary['sent']}, Delivered: {summary['delivered']}, Opened: {summary['opened']}
- Clicked: {summary['clicked']}, Converted: {summary['converted']}, Failed: {summary['failed']}

Provide a single, concrete, highly actionable next campaign recommendation (1-2 sentences).
For example: "37% clicked but only 4 converted. Run a follow-up for Gold-tier clickers with a stronger discount."
Do not write markdown headers, intro, or quotes. Just return the raw text of the recommendation.
"""
    try:
        next_rec = generate(rec_prompt)
    except Exception:
        next_rec = "Based on results, consider a follow-up offer for engaged clickers."

    full_text = f"{insights}\n\n[NEXT_REC]\n{next_rec}\n[NEXT_REC]"

    try:
        supabase.table("campaigns").update({"insights_cache": full_text}).eq("id", campaign_id).execute()
    except Exception:
        pass  # non-fatal

    return {
        "cached": False,
        "insights": insights,
        "next_campaign_recommendation": next_rec,
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
