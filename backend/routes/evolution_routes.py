from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.evolution.evolution_service import (
    get_all_instances,
    get_instance_status,
    send_text_message,
)
from services.jarvis.jarvis_event_service import register_jarvis_event

router = APIRouter(prefix="/evolution", tags=["Evolution"])


class SendMessagePayload(BaseModel):
    instance_name: str
    phone: str
    text: str


@router.get("/instances")
async def list_evolution_instances():
    try:
        instances = await get_all_instances()

        active_instances = [
            instance for instance in instances
            if str(instance.get("status", "")).lower() in ["open", "connected", "online"]
        ]

        register_jarvis_event(
            event_type="evolution_instances_listed",
            origin="evolution",
            actor="evolution_api",
            meta={
                "totalInstances": len(instances),
                "activeInstances": len(active_instances),
                "instances": active_instances,
            },
            module="evolution_routes",
        )

        return {
            "ok": True,
            "total": len(instances),
            "active": len(active_instances),
            "instances": active_instances,
        }

    except Exception as error:
        register_jarvis_event(
            event_type="evolution_instances_list_failed",
            origin="evolution",
            actor="evolution_api",
            meta={"error": str(error)},
            module="evolution_routes",
        )

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar instâncias do Evolution: {error}"
        )


@router.get("/instance/status")
async def evolution_instance_status(instance_name: str = Query(...)):
    try:
        result = await get_instance_status(instance_name)

        register_jarvis_event(
            event_type="evolution_instance_status_checked",
            origin="evolution",
            actor="evolution_api",
            meta=result,
            module="evolution_routes",
        )

        return result

    except Exception as error:
        register_jarvis_event(
            event_type="evolution_instance_status_failed",
            origin="evolution",
            actor="evolution_api",
            meta={
                "instance_name": instance_name,
                "error": str(error),
            },
            module="evolution_routes",
        )

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar status da instância: {error}"
        )


@router.post("/message/send")
async def evolution_send_message(payload: SendMessagePayload):
    try:
        result = await send_text_message(
            instance_name=payload.instance_name,
            phone=payload.phone,
            text=payload.text,
        )

        register_jarvis_event(
            event_type="evolution_message_sent",
            origin="evolution",
            actor="evolution_api",
            meta={
                "instance_name": payload.instance_name,
                "phone": payload.phone,
            },
            module="evolution_routes",
        )

        return result

    except Exception as error:
        register_jarvis_event(
            event_type="evolution_message_send_failed",
            origin="evolution",
            actor="evolution_api",
            meta={
                "instance_name": payload.instance_name,
                "phone": payload.phone,
                "error": str(error),
            },
            module="evolution_routes",
        )

        raise HTTPException(
            status_code=500,
            detail=f"Erro ao enviar mensagem pela Evolution: {error}"
        )