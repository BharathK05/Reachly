from ai_client import generate
import random
import string


def _generate_discount_code(prefix: str = "SB") -> str:
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}{suffix}"


def run(context: dict) -> dict:
    """
    Generate a personalized campaign message with offer, tone, and discount code.
    context keys: goal, campaign_type, strategy, audience_size
    """
    goal = context.get("goal", "")
    campaign_type = context.get("campaign_type", "Reactivation")
    strategy = context.get("strategy", "")
    audience_size = context.get("audience_size", 0)
    discount_code = _generate_discount_code()

    prompt = f"""
You are a creative copywriter for Starbucks India.
Campaign Type: {campaign_type}
Goal: "{goal}"
Strategy: {strategy}
Audience Size: {audience_size} customers
Discount Code: {discount_code}

Write a single personalized campaign message (2-3 sentences max) that:
1. Addresses the customer warmly using {{name}} as the placeholder
2. Includes a compelling offer relevant to the campaign type
3. Includes the discount code {discount_code}
4. Ends with a clear call to action
5. Feels warm and on-brand for Starbucks India

Return ONLY the message text. No labels, no explanations.
"""

    message = generate(prompt)

    return {
        "message": message,
        "discount_code": discount_code,
    }
