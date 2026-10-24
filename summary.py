import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)

MODEL_NAME = "gemini-3.5-flash"

sample_text = """
INVOICE

Invoice Number: INV-2026-101
Customer: ABC Technologies
Total Amount: Rs. 25,000
Due Date: 30 November 2026

Payment is outstanding.
"""

try:
    print(f"Testing model: {MODEL_NAME}")

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=(
            "Summarize this document in two sentences. "
            "Preserve the important dates and amounts.\n\n"
            f"{sample_text}"
        ),
    )

    print("\nSUMMARY:")
    print(response.text)

except Exception as e:
    print(f"\nError type: {type(e).__name__}")
    print(f"Error details: {e}")

finally:
    client.close()