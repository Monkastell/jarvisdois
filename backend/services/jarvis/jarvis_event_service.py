from __future__ import annotations

from datetime import datetime
from typing import Any


EVENT_LOG: list[dict[str, Any]] = []


def register_jarvis_event(
    event_type: str,
    origin: str = "system",
    actor: str = "jarvis",
    lead: dict | None = None,
    previous: dict | None = None,
    meta: dict | None = None,
    module: str = "unknown",
    **kwargs,
):
    """
    Barramento interno do Jarvis.

    Compatibilidades aceitas:
    - source -> origin
    - metadata -> meta
    """
    if "source" in kwargs and kwargs["source"]:
        origin = kwargs["source"]

    if "metadata" in kwargs and kwargs["metadata"] is not None:
        meta = kwargs["metadata"]

    event = {
        "event_type": event_type,
        "origin": origin,
        "actor": actor,
        "lead": lead or {},
        "previous": previous or {},
        "meta": meta or {},
        "module": module,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }

    EVENT_LOG.append(event)
    print("[JarvisEvent]", event)
    return event


def list_events():
    return EVENT_LOG


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