import json
import asyncio
from typing import AsyncGenerator

from agents import strategy_agent, audience_agent, content_agent, channel_agent, prediction_agent
from db.client import get_supabase


async def run_campaign(campaign_id: str, goal: str, budget: float) -> AsyncGenerator[str, None]:
    """
    Runs all 5 agents sequentially, yielding SSE-formatted strings.
    Each event: data: {"step": ..., "status": ..., "output": ..., ...}
    """

    def sse(payload: dict) -> str:
        return f"data: {json.dumps(payload)}\n\n"

    context: dict = {"goal": goal, "budget": budget, "campaign_id": campaign_id}

    # ── Step 1: Strategy ─────────────────────────────────────────────────────
    yield sse({"step": "strategy", "status": "active", "output": "Analyzing your goal..."})
    await asyncio.sleep(0.1)

    try:
        strategy_result = await asyncio.to_thread(strategy_agent.run, context)
        context.update(strategy_result)
        yield sse({
            "step": "strategy",
            "status": "done",
            "output": f"**{strategy_result['campaign_type']}** — {strategy_result['strategy']}",
        })
    except Exception as e:
        yield sse({"step": "strategy", "status": "error", "output": str(e)})
        return

    # ── Step 2: Audience ─────────────────────────────────────────────────────
    yield sse({"step": "audience", "status": "active", "output": "Querying customer database..."})
    await asyncio.sleep(0.1)

    try:
        audience_result = await asyncio.to_thread(audience_agent.run, context)
        context.update(audience_result)
        yield sse({
            "step": "audience",
            "status": "done",
            "output": f"Found **{audience_result['audience_size']}** matching customers.",
            "audience_size": audience_result["audience_size"],
        })
    except Exception as e:
        yield sse({"step": "audience", "status": "error", "output": str(e)})
        return

    # ── Step 3: Content ──────────────────────────────────────────────────────
    yield sse({"step": "content", "status": "active", "output": "Crafting personalized message..."})
    await asyncio.sleep(0.1)

    try:
        content_result = await asyncio.to_thread(content_agent.run, context)
        context.update(content_result)
        yield sse({
            "step": "content",
            "status": "done",
            "output": content_result["message"],
            "discount_code": content_result["discount_code"],
        })
    except Exception as e:
        yield sse({"step": "content", "status": "error", "output": str(e)})
        return

    # ── Step 4: Channel ──────────────────────────────────────────────────────
    yield sse({"step": "channel", "status": "active", "output": "Selecting optimal channel..."})
    await asyncio.sleep(0.1)

    try:
        channel_result = await asyncio.to_thread(channel_agent.run, context)
        context.update(channel_result)
        yield sse({
            "step": "channel",
            "status": "done",
            "output": channel_result["channel_note"],
            "channel": channel_result["channel"],
            "estimated_cost": channel_result["estimated_cost"],
            "final_audience_size": channel_result["final_audience_size"],
        })
    except Exception as e:
        yield sse({"step": "channel", "status": "error", "output": str(e)})
        return

    # ── Step 5: Prediction ───────────────────────────────────────────────────
    yield sse({"step": "prediction", "status": "active", "output": "Forecasting campaign performance..."})
    await asyncio.sleep(0.1)

    try:
        prediction_result = await asyncio.to_thread(prediction_agent.run, context)
        context.update(prediction_result)
        p = prediction_result["predictions"]
        yield sse({
            "step": "prediction",
            "status": "done",
            "output": p.get("reasoning", "Predictions generated."),
            "predictions": p,
        })
    except Exception as e:
        yield sse({"step": "prediction", "status": "error", "output": str(e)})
        return

    # ── Persist results to Supabase ──────────────────────────────────────────
    try:
        supabase = get_supabase()
        # Trim customer_ids to final_audience_size
        customer_ids = context.get("customer_ids", [])
        final_size = context.get("final_audience_size", len(customer_ids))
        customer_ids = customer_ids[:final_size]

        supabase.table("campaigns").update({
            "channel": context.get("channel"),
            "audience_criteria": context.get("filters", {}),
            "audience_size": final_size,
            "message": context.get("message"),
            "predictions": context.get("predictions", {}),
            "estimated_cost": context.get("estimated_cost"),
            "status": "pending_approval",
        }).eq("id", campaign_id).execute()
    except Exception as e:
        yield sse({"step": "persist", "status": "error", "output": str(e)})

    # ── Approval gate ────────────────────────────────────────────────────────
    yield sse({
        "step": "approval",
        "status": "waiting",
        "output": "Campaign is ready for your review.",
        "summary": {
            "campaign_type": context.get("campaign_type"),
            "channel": context.get("channel"),
            "audience_size": context.get("final_audience_size"),
            "estimated_cost": context.get("estimated_cost"),
            "message": context.get("message"),
            "discount_code": context.get("discount_code"),
            "predictions": context.get("predictions", {}),
        },
        "customer_ids": customer_ids,
        "customer_names": context.get("customer_names", {}),
    })
