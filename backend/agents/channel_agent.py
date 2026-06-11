from ai_client import generate
import math

# Channel costs per message (INR)
CHANNEL_COSTS = {
    "WhatsApp": 0.50,
    "SMS": 0.30,
    "Email": 0.10,
}

CHANNEL_PRIORITY = ["WhatsApp", "SMS", "Email"]


def run(context: dict) -> dict:
    """
    Select best channel based on budget and audience size.
    Falls back WhatsApp → SMS → Email. Trims audience if Email still over budget.
    context keys: goal, budget, audience_size
    """
    goal = context.get("goal", "")
    budget = float(context.get("budget", 0))
    audience_size = int(context.get("audience_size", 0))

    selected_channel = None
    selected_cost = 0.0
    trimmed = False
    trim_note = None
    final_audience_size = audience_size

    for channel in CHANNEL_PRIORITY:
        cost_per_msg = CHANNEL_COSTS[channel]
        total_cost = cost_per_msg * audience_size
        if total_cost <= budget:
            selected_channel = channel
            selected_cost = total_cost
            break

    # If even Email exceeds budget, trim audience
    if selected_channel is None:
        email_cost = CHANNEL_COSTS["Email"]
        max_recipients = int(math.floor(budget / email_cost))
        selected_channel = "Email"
        final_audience_size = max_recipients
        selected_cost = email_cost * max_recipients
        trimmed = True
        trim_note = (
            f"Audience trimmed from {audience_size} to {max_recipients} to fit budget of ₹{budget}. "
            f"Falling back to Email at ₹{email_cost}/msg."
        )

    channel_note = trim_note or (
        f"Selected {selected_channel} at ₹{CHANNEL_COSTS[selected_channel]}/msg. "
        f"Total cost: ₹{selected_cost:.2f} for {final_audience_size} recipients."
    )

    return {
        "channel": selected_channel,
        "cost_per_message": CHANNEL_COSTS[selected_channel],
        "estimated_cost": round(selected_cost, 2),
        "final_audience_size": final_audience_size,
        "trimmed": trimmed,
        "channel_note": channel_note,
    }
