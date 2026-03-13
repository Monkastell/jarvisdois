from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.ai.gemini_service import is_gemini_available, run_gemini

router = APIRouter(prefix="/ai", tags=["ai"])


class GeminiPromptPayload(BaseModel):
    prompt: str


@router.get("/gemini/status")
def gemini_status():
    return is_gemini_available()


@router.post("/gemini/test")
def gemini_test(payload: GeminiPromptPayload):
    status = is_gemini_available()

    if not status["ok"]:
      raise HTTPException(status_code=503, detail=status["error"])

    result = run_gemini(payload.prompt)
    return {
        "ok": True,
        "response": result,
    }