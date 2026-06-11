# ai_client.py
# Swap provider by changing this file only.
# Current: OpenAI (gpt-4o-mini). Switch back to Gemini by reverting this file.

import os
from openai import OpenAI

_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def generate(prompt: str) -> str:
    """Generate text from a prompt using the configured AI provider."""
    response = _client.chat.completions.create(
        model="gpt-5.4-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()
