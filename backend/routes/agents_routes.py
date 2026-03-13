from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.agents.agent_builder_schema_service import get_agent_builder_schema
from services.agents.agent_registry_service import (
    create_agent,
    get_agent,
    list_agents,
    set_agent_status,
    update_agent,
)
from services.agents.agent_runtime_service import run_agent


router = APIRouter(prefix="/agents", tags=["agents"])


class AgentCreatePayload(BaseModel):
    id: str
    name: str
    type: str = "generic"
    description: str = ""
    status: str = "active"
    llm_enabled: bool = False
    allowed_tools: List[str] = Field(default_factory=list)
    listening: Dict[str, bool] = Field(default_factory=dict)
    handoff_rules: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentUpdatePayload(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    llm_enabled: Optional[bool] = None
    allowed_tools: Optional[List[str]] = None
    listening: Optional[Dict[str, bool]] = None
    handoff_rules: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None


class AgentRunActionPayload(BaseModel):
    tool: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class AgentRunPayload(BaseModel):
    event: Dict[str, Any] = Field(default_factory=dict)
    lead: Dict[str, Any] = Field(default_factory=dict)
    actions: List[AgentRunActionPayload] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)


class AgentStatusPayload(BaseModel):
    status: str


@router.get("/builder/schema")
def route_agent_builder_schema():
    return get_agent_builder_schema()


@router.get("/")
def route_list_agents(include_disabled: bool = True):
    return {
        "ok": True,
        "items": list_agents(include_disabled=include_disabled),
    }


@router.get("/{agent_id}")
def route_get_agent(agent_id: str):
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")
    return {
        "ok": True,
        "item": agent,
    }


@router.post("/")
def route_create_agent(payload: AgentCreatePayload):
    try:
        created = create_agent(payload.model_dump())
        return {
            "ok": True,
            "item": created,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{agent_id}")
def route_update_agent(agent_id: str, payload: AgentUpdatePayload):
    try:
        updated = update_agent(
            agent_id=agent_id,
            updates={k: v for k, v in payload.model_dump().items() if v is not None},
        )
        return {
            "ok": True,
            "item": updated,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/{agent_id}/status")
def route_set_agent_status(agent_id: str, payload: AgentStatusPayload):
    try:
        updated = set_agent_status(agent_id, payload.status)
        return {
            "ok": True,
            "item": updated,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{agent_id}/run")
def route_run_agent(agent_id: str, payload: AgentRunPayload):
    try:
        result = run_agent(
            agent_id=agent_id,
            event=payload.event,
            lead=payload.lead,
            actions=[action.model_dump() for action in payload.actions],
            extra=payload.extra,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao executar agente: {exc}")