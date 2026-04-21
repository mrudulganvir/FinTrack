from mistralai.client import Mistral
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("MISTRAL_API_KEY")
model = "mistral-small"
client = Mistral(api_key=api_key)

def clean_llm_response(text: str) -> str:
    import re
    # Just fix excessive spacing, keep markdown syntax for the frontend
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def format_transactions(transactions):
    lines = []
    for t in transactions:
        lines.append(
            f"{t.transaction_date.date()} | {t.type} | {t.category} | ₹{t.amount} | {t.description}"
        )
    return "\n".join(lines)


def generate_reply(user_query: str, transactions):
    context = format_transactions(transactions)

    prompt = f"""
You are a smart personal finance assistant.

Format your response like this:
- Use headings (##)
- Use bullet points
- Keep it clean and readable
- Avoid long paragraphs
- Highlight important numbers

User transactions:
{context}

User question:
{user_query}

Instructions:
- Answer clearly in simple language
- Mention exact amounts
- Be helpful and concise
"""

    chat_response = client.chat.complete(
        model=model,
        messages=[
            {
                "role": "user",
                "content": prompt,
            },
        ]
    )
    
    cleaned = clean_llm_response(chat_response.choices[0].message.content)

    return cleaned