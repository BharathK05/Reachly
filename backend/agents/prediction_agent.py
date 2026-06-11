from ai_client import generate
import json
import re


def run(context: dict) -> dict:
    """
    Predict campaign performance metrics.
    context keys: campaign_type, channel, audience_size, message, estimated_cost
    """
    campaign_type = context.get("campaign_type", "Reactivation")
    channel = context.get("channel", "Email")
    audience_size = context.get("audience_size", 0)
    estimated_cost = context.get("estimated_cost", 0)

    prompt = f"""
You are a campaign analytics expert for Starbucks India.
Campaign Type: {campaign_type}
Channel: {channel}
Audience Size: {audience_size}
Estimated Cost: ₹{estimated_cost}

Predict realistic campaign performance metrics for an Indian QSR/coffee brand.
Respond ONLY in raw JSON (no markdown, no code fences). Use this exact schema:
{{
  "open_rate": <float 0-1>,
  "ctr": <float 0-1>,
  "conversion_rate": <float 0-1>,
  "estimated_conversions": <integer>,
  "reasoning": "<one sentence explaining the predictions>"
}}
"""

    raw = generate(prompt)

    # Strip any accidental markdown fences
    raw = re.sub(r'```json|```', '', raw).strip()

    try:
        predictions = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback defaults if model doesn't comply
        predictions = {
            "open_rate": 0.35,
            "ctr": 0.12,
            "conversion_rate": 0.05,
            "estimated_conversions": max(1, int(audience_size * 0.05)),
            "reasoning": "Default estimates based on industry benchmarks for Indian QSR campaigns.",
        }

    return {"predictions": predictions}
