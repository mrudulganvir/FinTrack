from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatMistralAI(
    model="mistral-tiny",
    temperature=0.3,
    api_key=os.getenv("MISTRAL_API_KEY")
)

print("MISTRAL KEY:", os.getenv("MISTRAL_API_KEY"))

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

    prompt = ChatPromptTemplate.from_template("""
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
{question}

Instructions:
- Answer clearly in simple language
- Mention exact amounts
- Be helpful and concise
""")

    chain = prompt | llm

    response = chain.invoke({
        "context": context,
        "question": user_query
    })
    
    cleaned = clean_llm_response(response.content)

    return cleaned