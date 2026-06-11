from ai_client import generate


def run(context: dict) -> dict:
    """
    Classify the campaign goal and return a strategy summary.
    context keys: goal, budget
    """
    goal = context.get("goal", "")
    budget = context.get("budget", 0)

    prompt = f"""
You are a senior CRM strategist for Starbucks India.
A marketing manager has described this campaign goal: "{goal}"
Budget: ₹{budget}

1. Classify the campaign type (e.g. Reactivation, Loyalty Boost, New Product Launch, Seasonal Promotion, Win-back).
2. Write a 2-3 sentence strategy summary explaining the approach.

Respond in this exact format:
Campaign Type: <type>
Strategy: <summary>
"""

    raw = generate(prompt)
    lines = raw.strip().splitlines()
    campaign_type = ""
    strategy = ""
    for line in lines:
        if line.startswith("Campaign Type:"):
            campaign_type = line.replace("Campaign Type:", "").strip()
        elif line.startswith("Strategy:"):
            strategy = line.replace("Strategy:", "").strip()

    return {
        "campaign_type": campaign_type,
        "strategy": strategy,
        "raw": raw,
    }
