from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.prospeccao.whatsapp_disparo_service import (
    create_disparo,
    delete_disparo,
    get_disparo,
    list_disparos,
    pause_disparo,
    resume_disparo,
    start_disparo,
)

router = APIRouter(prefix="/prospeccao", tags=["Prospecção"])


class CreateWhatsAppDisparoPayload(BaseModel):
    name: str = "Disparo WhatsApp"
    contacts_text: str
    instances: List[str] = Field(default_factory=list)
    instance_bindings: Dict[str, Dict] = Field(default_factory=dict)
    template: str
    selected_template_id: str = ""
    templates_rotativos: List[str] = Field(default_factory=list)
    priority: str = "media"
    delay_seconds: int = 8
    delay_between_instances: int = 30
    typing_speed: int = 60


@router.get("/whatsapp/disparos")
async def route_list_whatsapp_disparos():
    items = await list_disparos()
    return {"ok": True, "items": items}


@router.get("/whatsapp/disparos/{disparo_id}")
async def route_get_whatsapp_disparo(disparo_id: str):
    item = await get_disparo(disparo_id)
    if not item:
        raise HTTPException(status_code=404, detail="Disparo não encontrado.")
    return {"ok": True, "item": item}


@router.post("/whatsapp/disparos")
async def route_create_whatsapp_disparo(payload: CreateWhatsAppDisparoPayload):
    try:
        item = await create_disparo(payload.model_dump())
        return {"ok": True, "item": item}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/whatsapp/disparos/{disparo_id}/start")
async def route_start_whatsapp_disparo(disparo_id: str):
    try:
        item = await start_disparo(disparo_id)
        return {"ok": True, "item": item}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/whatsapp/disparos/{disparo_id}/pause")
async def route_pause_whatsapp_disparo(disparo_id: str):
    try:
        item = await pause_disparo(disparo_id)
        return {"ok": True, "item": item}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/whatsapp/disparos/{disparo_id}/resume")
async def route_resume_whatsapp_disparo(disparo_id: str):
    try:
        item = await resume_disparo(disparo_id)
        return {"ok": True, "item": item}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/whatsapp/disparos/{disparo_id}")
async def route_delete_whatsapp_disparo(disparo_id: str):
    try:
        result = await delete_disparo(disparo_id)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))