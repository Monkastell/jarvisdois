from __future__ import annotations

from typing import Any, Dict, List, Optional

from services.agents.agent_registry_service import list_agents
from services.agents.agent_runtime_service import run_agent
from services.jarvis.jarvis_event_service import register_jarvis_event


def _agent_listens_channel(agent: Dict[str, Any], channel: str) -> bool:
    listening = agent.get("listening", {}) or {}
    if not isinstance(listening, dict):
        return False
    return bool(listening.get(channel, False))


def _find_listening_agents(channel: str) -> List[Dict[str, Any]]:
    agents = list_agents(include_disabled=False)
    return [
        agent
        for agent in agents
        if agent.get("status") == "active" and _agent_listens_channel(agent, channel)
    ]


def dispatch_event_to_agents(
    *,
    event: Dict[str, Any],
    lead: Optional[Dict[str, Any]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    channel = event.get("channel") or event.get("source") or "unknown"
    triggered_agents = _find_listening_agents(channel)
    results: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

    register_jarvis_event(
        event_type="agent_dispatch_started",
        source="agent_dispatcher",
        actor="dispatcher",
        lead=lead or {},
        metadata={
            "channel": channel,
            "event_type": event.get("type"),
            "agents_found": [agent.get("id") for agent in triggered_agents],
        },
        module="agent_event_dispatcher",
    )

    for agent in triggered_agents:
        try:
            result = run_agent(
                agent_id=agent.get("id"),
                event=event,
                lead=lead,
                actions=[],
                extra=extra,
            )
            results.append(result)
        except Exception as exc:
            error_payload = {
                "agent_id": agent.get("id"),
                "error": str(exc),
            }
            errors.append(error_payload)

            register_jarvis_event(
                event_type="agent_dispatch_error",
                source="agent_dispatcher",
                actor=agent.get("id"),
                lead=lead or {},
                metadata=error_payload,
                module="agent_event_dispatcher",
            )

    register_jarvis_event(
        event_type="agent_dispatch_finished",
        source="agent_dispatcher",
        actor="dispatcher",
        lead=lead or {},
        metadata={
            "channel": channel,
            "triggered_agents": [agent.get("id") for agent in triggered_agents],
            "results_count": len(results),
            "errors_count": len(errors),
        },
        module="agent_event_dispatcher",
    )

    return {
        "ok": True,
        "channel": channel,
        "agents_triggered": [agent.get("id") for agent in triggered_agents],
        "results": results,
        "errors": errors,
    }