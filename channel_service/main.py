import asyncio
import random
import os
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Reachly Channel Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Recipient(BaseModel):
    log_id: str
    customer_name: str
    channel: str


class SendRequest(BaseModel):
    campaign_id: str
    recipients: list[Recipient]
    callback_url: str


async def _fire_event(client: httpx.AsyncClient, callback_url: str, log_id: str, event_type: str):
    """POST a single event to the CRM callback URL with retry."""
    for attempt in range(3):
        try:
            resp = await client.post(
                callback_url,
                json={"log_id": log_id, "event_type": event_type},
                timeout=10.0,
            )
            if resp.status_code < 500:
                return  # success or 4xx (don't retry)
        except Exception:
            pass
        if attempt < 2:
            await asyncio.sleep(0.5 * (attempt + 1))


async def _simulate_recipient(client: httpx.AsyncClient, callback_url: str, recipient: Recipient):
    """
    Simulate the full delivery journey for one recipient.

    Funnel:
      sent → [5% fail] → delivered → [50% read] → [70% opened] → [30% clicked] → [15% converted]
    """
    log_id = recipient.log_id

    # Stagger start time so events don't all fire at once
    await asyncio.sleep(random.uniform(0.3, 2.5))

    # 1. Sent
    await _fire_event(client, callback_url, log_id, "sent")

    # 2. 5% failure
    if random.random() < 0.05:
        await asyncio.sleep(random.uniform(0.2, 0.8))
        await _fire_event(client, callback_url, log_id, "failed")
        return

    # 3. Delivered (95%)
    await asyncio.sleep(random.uniform(0.2, 0.8))
    await _fire_event(client, callback_url, log_id, "delivered")

    # 4. Read — WhatsApp double blue-tick (50% of delivered)
    if random.random() < 0.50:
        await asyncio.sleep(random.uniform(0.3, 1.2))
        await _fire_event(client, callback_url, log_id, "read")

        # 5. Opened (70% of read)
        if random.random() < 0.70:
            await asyncio.sleep(random.uniform(0.4, 1.5))
            await _fire_event(client, callback_url, log_id, "opened")

            # 6. Clicked (30% of opened)
            if random.random() < 0.30:
                await asyncio.sleep(random.uniform(0.3, 1.0))
                await _fire_event(client, callback_url, log_id, "clicked")

                # 7. Converted — "order came because of this communication" (60% of clicked)
                if random.random() < 0.60:
                    await asyncio.sleep(random.uniform(1.0, 3.0))
                    await _fire_event(client, callback_url, log_id, "converted")


@app.post("/send")
async def send_messages(body: SendRequest):
    """
    Accept a list of recipients and simulate delivery events concurrently.
    Returns immediately; fires callbacks asynchronously.
    """
    asyncio.create_task(_dispatch_all(body))
    return {
        "status": "dispatching",
        "recipient_count": len(body.recipients),
        "campaign_id": body.campaign_id,
    }


async def _dispatch_all(body: SendRequest):
    """Run all recipient simulations concurrently."""
    async with httpx.AsyncClient() as client:
        tasks = [
            _simulate_recipient(client, body.callback_url, recipient)
            for recipient in body.recipients
        ]
        await asyncio.gather(*tasks, return_exceptions=True)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "reachly-channel-service"}
