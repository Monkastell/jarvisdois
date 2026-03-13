from __future__ import annotations

from typing import Any, Dict, Optional

from services.agents.agent_registry_service import get_agent


def resolve_handoff(agent: Dict[str, Any], context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Decide se o agente atual deve entregar o controle para outro agente.
    Regra simples por enquanto: compara condition com intent/intenção detectada.
    """
    handoff_rules = agent.get("handoff_rules", [])
    intent = (
        context.get("event", {}).get("intent")
        or context.get("extra", {}).get("intent")
        or context.get("lead", {}).get("intent")
    )

    for rule in handoff_rules:
        condition = rule.get("condition")
        target_agent_id = rule.get("target_agent")

        if not condition or not target_agent_id:
            continue

        if condition == intent:
            target_agent = get_agent(target_agent_id)
            if target_agent and target_agent.get("status") == "active":
                return {
                    "from_agent": agent.get("id"),
                    "to_agent": target_agent_id,
                    "reason": condition,
                }

    return None