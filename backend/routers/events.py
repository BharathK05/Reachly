from fastapi import APIRouter, HTTPException
from db.client import get_supabase
from models.schemas import EventCallback
from datetime import datetime, timezone

router = APIRouter(prefix="/api/events", tags=["events"])

# Status rank — higher rank = more progressed in the funnel
# "failed" is treated separately (can override anything)
STATUS_RANK = {
    "pending":   0,
    "sent":      1,
    "delivered": 2,
    "read":      3,
    "opened":    4,
    "clicked":   5,
    "converted": 6,
    "failed":    99,  # special: always overrides on failure
}


@router.post("/callback")
async def event_callback(body: EventCallback):
    """
    Receive delivery events from Channel Service.
    Inserts into communication_events and updates communication_logs.status.
    """
    supabase = get_supabase()

    # 1. Insert raw event record (full audit trail)
    try:
        supabase.table("communication_events").insert({
            "log_id": body.log_id,
            "event_type": body.event_type,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert event: {e}")

    # 2. Update log status — only advance forward in the funnel
    try:
        log_res = (
            supabase.table("communication_logs")
            .select("status, sent_at")
            .eq("id", body.log_id)
            .single()
            .execute()
        )
        current = log_res.data or {}
        current_rank = STATUS_RANK.get(current.get("status", ""), 0)
        new_rank = STATUS_RANK.get(body.event_type, 0)

        update_payload: dict = {}

        if body.event_type == "failed":
            # Failed overrides everything
            update_payload["status"] = "failed"
        elif new_rank > current_rank and body.event_type != "failed":
            update_payload["status"] = body.event_type

        # Set sent_at timestamp on first "sent" event
        if body.event_type == "sent" and not current.get("sent_at"):
            update_payload["sent_at"] = datetime.now(timezone.utc).isoformat()

        if update_payload:
            supabase.table("communication_logs").update(update_payload).eq("id", body.log_id).execute()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update log: {e}")

    return {"ok": True, "event": body.event_type, "log_id": body.log_id}
