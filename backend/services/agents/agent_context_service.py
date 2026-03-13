from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def build_agent_context(
    *,
    agent: Dict[str, Any],
    event: Optional[Dict[str, Any]] = None,
    lead: Optional[Dict[str, Any]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Monta o contexto operacional que o runtime entrega ao agente.
    O agente não fala com serviços diretamente; ele só enxerga o contexto.
    """
    event = deepcopy(event or {})
    lead = deepcopy(lead or {})
    extra = deepcopy(extra or {})

    channel = (
        event.get("channel")
        or event.get("source")
        or extra.get("channel")
        or "unknown"
    )

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": {
            "id": agent.get("id"),
            "name": agent.get("name"),
            "type": agent.get("type"),
            "allowed_tools": list(agent.get("allowed_tools", [])),
            "llm_enabled": bool(agent.get("llm_enabled", False)),
        },
        "event": event,
        "lead": lead,
        "channel": channel,
        "memory": {
            "last_intent": extra.get("last_intent"),
            "notes": extra.get("notes", []),
        },
        "integration": {
            "whatsapp_enabled": bool(agent.get("listening", {}).get("whatsapp", False)),
            "sms_enabled": bool(agent.get("listening", {}).get("sms", False)),
        },
        "extra": extra,
    }