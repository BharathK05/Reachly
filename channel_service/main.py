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
    """POST a single event to the CRM callback URL."""
    try:
        await client.post(
            callback_url,
            json={"log_id": log_id, "event_type": event_type},
            timeout=10.0,
        )
    except Exception:
        pass  # Best-effort delivery


async def _simulate_recipient(client: httpx.AsyncClient, callback_url: str, recipient: Recipient):
    """Simulate the delivery journey for one recipient."""
    log_id = recipient.log_id

    # Random initial delay (0.5–3s) to stagger events
    await asyncio.sleep(random.uniform(0.5, 3.0))

    # Sent
    await _fire_event(client, callback_url, log_id, "sent")

    # 5% chance of failure
    if random.random() < 0.05:
        await asyncio.sleep(random.uniform(0.2, 0.8))
        await _fire_event(client, callback_url, log_id, "failed")
        return

    # Delivered (95% base)
    await asyncio.sleep(random.uniform(0.3, 1.0))
    await _fire_event(client, callback_url, log_id, "delivered")

    # Opened (70% of delivered)
    if random.random() < 0.70:
        await asyncio.sleep(random.uniform(0.5, 2.0))
        await _fire_event(client, callback_url, log_id, "opened")

        # Clicked (30% of opened)
        if random.random() < 0.30:
            await asyncio.sleep(random.uniform(0.3, 1.0))
            await _fire_event(client, callback_url, log_id, "clicked")


@app.post("/send")
async def send_messages(body: SendRequest):
    """
    Accepts a list of recipients and simulates delivery events concurrently.
    Fires callbacks to the CRM backend for each event.
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
