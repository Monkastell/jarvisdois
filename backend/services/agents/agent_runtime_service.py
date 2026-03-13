from __future__ import annotations

from typing import Any, Dict, List, Optional

from services.agents.agent_context_service import build_agent_context
from services.agents.agent_handoff_service import resolve_handoff
from services.agents.agent_registry_service import get_agent
from services.agents.agent_tools_service import execute_tool
from services.jarvis.jarvis_event_service import register_jarvis_event


def run_agent(
    *,
    agent_id: str,
    event: Optional[Dict[str, Any]] = None,
    lead: Optional[Dict[str, Any]] = None,
    actions: Optional[List[Dict[str, Any]]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Executa um agente de forma controlada.
    O agente não chama integração diretamente; o runtime delega para tools.
    """
    agent = get_agent(agent_id)
    if not agent:
        raise ValueError(f"Agente '{agent_id}' não encontrado.")

    if agent.get("status") != "active":
        raise ValueError(f"Agente '{agent_id}' não está ativo.")

    context = build_agent_context(
        agent=agent,
        event=event,
        lead=lead,
        extra=extra,
    )

    register_jarvis_event(
        event_type="agent_execution_started",
        source="agent_runtime_service",
        actor=agent_id,
        metadata={
            "lead_id": context.get("lead", {}).get("id"),
            "event_type": context.get("event", {}).get("type"),
        },
    )

    results: List[Dict[str, Any]] = []
    for action in actions or []:
        tool_name = action.get("tool")
        payload = action.get("payload", {})

        if not tool_name:
            continue

        result = execute_tool(
            agent=agent,
            context=context,
            tool_name=tool_name,
            payload=payload,
        )
        results.append(result)

    handoff = resolve_handoff(agent, context)

    register_jarvis_event(
        event_type="agent_execution_finished",
        source="agent_runtime_service",
        actor=agent_id,
        metadata={
            "lead_id": context.get("lead", {}).get("id"),
            "results_count": len(results),
            "handoff": handoff,
        },
    )

    return {
        "ok": True,
        "agent": {
            "id": agent.get("id"),
            "name": agent.get("name"),
            "type": agent.get("type"),
        },
        "context": context,
        "results": results,
        "handoff": handoff,
    }