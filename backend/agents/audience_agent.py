from ai_client import generate
from db.client import get_supabase


def run(context: dict) -> dict:
    """
    Derive audience filters from the goal, query Supabase, and return customer IDs.
    context keys: goal, campaign_type, strategy
    """
    goal = context.get("goal", "")
    campaign_type = context.get("campaign_type", "")

    prompt = f"""
You are a CRM data analyst for Starbucks India.
Campaign Type: {campaign_type}
Goal: "{goal}"

Based on this goal, define customer filters from these available fields:
- total_spend (numeric, INR)
- days_since_last_purchase (integer)
- tier (Gold, Silver, Bronze)
- order_count (integer)

Return ONLY a JSON object with filter keys and their threshold values. Example:
{{"total_spend_min": 5000, "days_since_min": 45, "tier": null, "order_count_min": null}}

For reactivation goals use: total_spend_min: 5000, days_since_min: 45
Respond in raw JSON only, no markdown.
"""

    raw = generate(prompt)

    # Parse the JSON filters from AI
    import json, re
    try:
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        filters = json.loads(json_match.group()) if json_match else {}
    except Exception:
        filters = {"total_spend_min": 5000, "days_since_min": 45}

    # Query Supabase
    supabase = get_supabase()
    query = supabase.table("customers").select("id, name, tier, total_spend, days_since_last_purchase")

    if filters.get("total_spend_min"):
        query = query.gte("total_spend", filters["total_spend_min"])
    if filters.get("days_since_min"):
        query = query.gte("days_since_last_purchase", filters["days_since_min"])
    if filters.get("tier"):
        query = query.eq("tier", filters["tier"])
    if filters.get("order_count_min"):
        query = query.gte("order_count", filters["order_count_min"])

    try:
        result = query.execute()
        customers = result.data or []
    except Exception as e:
        customers = []

    customer_ids = [c["id"] for c in customers]
    customer_names = {c["id"]: c["name"] for c in customers}

    return {
        "filters": filters,
        "customer_ids": customer_ids,
        "customer_names": customer_names,
        "audience_size": len(customer_ids),
    }
