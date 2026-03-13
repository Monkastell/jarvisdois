from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
REGISTRY_FILE = DATA_DIR / "agents_registry.json"


DEFAULT_AGENTS: List[Dict[str, Any]] = [
    {
        "id": "receptivo",
        "name": "Agente Receptivo",
        "type": "receptivo",
        "description": "Entende o cliente, identifica intenção e prepara handoff.",
        "status": "active",
        "llm_enabled": False,
        "allowed_tools": [
            "send_whatsapp",
            "add_tag",
            "append_note",
            "handoff_agent",
            "read_sheet",
        ],
        "listening": {
            "whatsapp": True,
            "sms": False,
        },
        "handoff_rules": [
            {
                "condition": "cliente_interessado",
                "target_agent": "negociador",
            }
        ],
        "metadata": {
            "version": 1,
            "created_by": "system",
        },
    },
    {
        "id": "negociador",
        "name": "Agente Negociador",
        "type": "negociador",
        "description": "Assume leads qualificados e executa negociação guiada.",
        "status": "active",
        "llm_enabled": False,
        "allowed_tools": [
            "send_whatsapp",
            "send_sms",
            "append_note",
            "move_lead",
            "add_tag",
            "handoff_agent",
        ],
        "listening": {
            "whatsapp": True,
            "sms": True,
        },
        "handoff_rules": [],
        "metadata": {
            "version": 1,
            "created_by": "system",
        },
    },
]


def _ensure_data_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not REGISTRY_FILE.exists():
        REGISTRY_FILE.write_text(
            json.dumps(DEFAULT_AGENTS, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def _read_registry() -> List[Dict[str, Any]]:
    _ensure_data_file()
    try:
        content = REGISTRY_FILE.read_text(encoding="utf-8").strip()
        if not content:
            return deepcopy(DEFAULT_AGENTS)

        data = json.loads(content)
        if isinstance(data, list):
            return data
        return deepcopy(DEFAULT_AGENTS)
    except Exception:
        return deepcopy(DEFAULT_AGENTS)


def _write_registry(agents: List[Dict[str, Any]]) -> None:
    _ensure_data_file()
    REGISTRY_FILE.write_text(
        json.dumps(agents, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def list_agents(include_disabled: bool = True) -> List[Dict[str, Any]]:
    agents = _read_registry()
    if include_disabled:
        return agents
    return [agent for agent in agents if agent.get("status") != "disabled"]


def get_agent(agent_id: str) -> Optional[Dict[str, Any]]:
    agents = _read_registry()
    return next((agent for agent in agents if agent.get("id") == agent_id), None)


def create_agent(agent_data: Dict[str, Any]) -> Dict[str, Any]:
    agents = _read_registry()

    agent_id = (agent_data.get("id") or "").strip()
    if not agent_id:
        raise ValueError("agent_id obrigatório.")

    existing = get_agent(agent_id)
    if existing:
        raise ValueError(f"Agente '{agent_id}' já existe.")

    normalized = normalize_agent(agent_data)
    agents.append(normalized)
    _write_registry(agents)
    return normalized


def update_agent(agent_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    agents = _read_registry()
    index = next((i for i, agent in enumerate(agents) if agent.get("id") == agent_id), None)

    if index is None:
        raise ValueError(f"Agente '{agent_id}' não encontrado.")

    merged = deepcopy(agents[index])
    merged.update(updates)

    if "id" in updates and updates["id"] != agent_id:
        raise ValueError("Não é permitido alterar o id do agente.")

    merged = normalize_agent(merged)
    agents[index] = merged
    _write_registry(agents)
    return merged


def set_agent_status(agent_id: str, status: str) -> Dict[str, Any]:
    if status not in {"active", "inactive", "disabled"}:
        raise ValueError("Status inválido. Use active, inactive ou disabled.")
    return update_agent(agent_id, {"status": status})


def normalize_agent(agent_data: Dict[str, Any]) -> Dict[str, Any]:
    listening = agent_data.get("listening", {}) or {}
    metadata = agent_data.get("metadata", {}) or {}

    return {
        "id": str(agent_data.get("id", "")).strip(),
        "name": str(agent_data.get("name", "")).strip() or "Agente sem nome",
        "type": str(agent_data.get("type", "generic")).strip(),
        "description": str(agent_data.get("description", "")).strip(),
        "status": str(agent_data.get("status", "active")).strip(),
        "llm_enabled": bool(agent_data.get("llm_enabled", False)),
        "allowed_tools": list(agent_data.get("allowed_tools", [])),
        "listening": {
            "whatsapp": bool(listening.get("whatsapp", False)),
            "sms": bool(listening.get("sms", False)),
        },
        "handoff_rules": list(agent_data.get("handoff_rules", [])),
        "metadata": {
            "version": metadata.get("version", 1),
            "created_by": metadata.get("created_by", "user"),
            **metadata,
        },
    }
    
def dispatch_jarvis_event(
    event_type: str,
    origin: str = "system",
    actor: str = "jarvis",
    lead: dict | None = None,
    previous: dict | None = None,
    meta: dict | None = None,
    module: str = "unknown",
    auto_dispatch: bool = False,
):
    event = register_jarvis_event(
        event_type=event_type,
        origin=origin,
        actor=actor,
        lead=lead,
        previous=previous,
        meta=meta,
        module=module,
    )

    if auto_dispatch:
        from services.agents.agent_event_dispatcher import dispatch_event_to_agents

        dispatch_result = dispatch_event_to_agents(
            event={
                "type": event_type,
                "channel": (meta or {}).get("channel", "unknown"),
                "source": origin,
                "meta": meta or {},
            },
            lead=lead or {},
            extra={
                "previous": previous or {},
            },
        )
        return {
            "event": event,
            "dispatch": dispatch_result,
        }

    return {
        "event": event,
        "dispatch": None,
    }    