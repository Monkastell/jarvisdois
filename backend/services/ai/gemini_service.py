import os
from dotenv import load_dotenv

load_dotenv()

try:
    from google import genai
except Exception:
    genai = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

client = None
gemini_available = False
gemini_error = None

if not GEMINI_API_KEY:
    gemini_error = "GEMINI_API_KEY não encontrada no ambiente."
elif genai is None:
    gemini_error = "Biblioteca google-genai não instalada corretamente."
else:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        gemini_available = True
    except Exception as e:
        gemini_error = f"Falha ao inicializar cliente Gemini: {str(e)}"


def is_gemini_available():
    return {
        "ok": gemini_available,
        "error": gemini_error,
        "model": GEMINI_MODEL,
    }


def run_gemini(prompt: str) -> str:
    if not gemini_available or client is None:
        raise RuntimeError(gemini_error or "Gemini indisponível.")

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )

    return response.text