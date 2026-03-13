from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

from services.jarvis.jarvis_crm_service import process_crm_event


router = APIRouter(prefix="/crm", tags=["crm"])


class CRMEventPayload(BaseModel):
    lead: Dict[str, Any]
    previous: Dict[str, Any] | None = None
    origin: str | None = "crm"
    actor: str | None = "crm"
    meta: Dict[str, Any] | None = None


@router.post("/event")
def crm_event(payload: CRMEventPayload):
    result = process_crm_event(payload.dict())

    return {
        "ok": True,
        "result": result,
    }