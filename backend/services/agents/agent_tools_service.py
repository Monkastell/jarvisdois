from __future__ import annotations

from typing import Any, Callable, Dict

from services.agents.agent_registry_service import get_agent
from services.evolution.evolution_service import send_text_message_sync as evolution_send_message
from services.jarvis.jarvis_event_service import register_jarvis_event
from services.sms.airmore_service import send_sms as airmore_send_sms


class AgentToolPermissionError(Exception):
    pass


class AgentToolExecutionError(Exception):
    pass


def _ensure_tool_allowed(agent: Dict[str, Any], tool_name: str) -> None:
    allowed_tools = set(agent.get("allowed_tools", []))
    if tool_name not in allowed_tools:
        raise AgentToolPermissionError(
            f"Ferramenta '{tool_name}' não permitida para o agente '{agent.get('id')}'."
        )


def _tool_send_whatsapp(agent: Dict[str, Any], context: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_tool_allowed(agent, "send_whatsapp")

    instance_name = payload.get("instance_name") or context.get("extra", {}).get("instance_name")
    phone = payload.get("phone") or context.get("lead", {}).get("telefone")
    message = payload.get("message")

    if not instance_name or not phone or not message:
        raise AgentToolExecutionError("send_whatsapp exige instance_name, phone e message.")

    response = evolution_send_message(
        instance_name=instance_name,
        phone=phone,
        text=message,
    )

    register_jarvis_event(
        event_type="agent_tool_executed",
        source="agent_tools_service",
        actor=agent.get("id"),
        lead=context.get("lead", {}),
        metadata={
            "tool": "send_whatsapp",
            "phone": phone,
            "instance_name": instance_name,
            "response": response,
        },
        module="agent_tools_service",
    )

    return {
        "ok": True,
        "tool": "send_whatsapp",
        "response": response,
    }


def _tool_send_sms(agent: Dict[str, Any], context: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_tool_allowed(agent, "send_sms")

    phone = payload.get("phone") or context.get("lead", {}).get("telefone")
    message = payload.get("message")

    if not phone or not message:
        raise AgentToolExecutionError("send_sms exige phone e message.")

    response = airmore_send_sms(phone=phone, message=message)

    register_jarvis_event(
        event_type="agent_tool_executed",
        source="agent_tools_service",
        actor=agent.get("id"),
        lead=context.get("lead", {}),
        metadata={
            "tool": "send_sms",
            "phone": phone,
            "response": response,
        },
        module="agent_tools_service",
    )

    return {
        "ok": True,
        "tool": "send_sms",
        "response": response,
    }


def _tool_add_tag(agent: Dict[str, Any], context: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_tool_allowed(agent, "add_tag")

    tag = payload.get("tag")
    if not tag:
        raise AgentToolExecutionError("add_tag exige tag.")

    register_jarvis_event(
        event_type="agent_tool_executed",
        source="agent_tools_service",
        actor=agent.get("id"),
        lead=context.get("lead", {}),
        metadata={
            "tool": "add_tag",
            "lead_id": context.get("lead", {}).get("id"),
            "tag": tag,
        },
        module="agent_tools_service",
    )

    return {
        "ok": True,
        "tool": "add_tag",
        "tag": tag,
        "lead_id": context.get("lead", {}).get("id"),
    }


def _tool_append_note(agent: Dict[str, Any], context: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_tool_allowed(agent, "append_note")

    note = payload.get("note")
    if not note:
        raise AgentToolExecutionError("append_note exige note.")

    register_jarvis_event(
        event_type="agent_tool_executed",
        source="agent_tools_service",
        actor=agent.get("id"),
        lead=context.get("lead", {}),
        metadata={
            "tool": "append_note",
            "lead_id": context.get("lead", {}).get("id"),
            "note": note,
        },
        module="agent_tools_service",
    )

    return {
        "ok": True,
        "tool": "append_note",
        "note": note,
        "lead_id": context.get("lead", {}).get("id"),
    }


def _tool_move_lead(agent: Dict[str, Any], context: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_tool_allowed(agent, "move_lead")

    target_column = payload.get("target_column")
    if not target_column:
        raise AgentToolExecutionError("move_lead exige target_column.")

    register_jarvis_event(
        event_type="agent_tool_executed",
        source="agent_tools_service",
        actor=agent.get("id"),
        lead=context.get("lead", {}),
        metadata={
            "tool": "move_lead",
            "lead_id": context.get("lead", {}).get("id"),
            "target_column": target_column,
        },
        module="agent_tools_service",
    )

    return {
        "ok": True,
        "tool": "move_lead",
        "lead_id": context.get("lead", {}).get("id"),
        "target_column": target_column,
    }


def _tool_handoff_agent(agent: Dict[str, Any], context: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_tool_allowed(agent, "handoff_agent")

    target_agent_id = payload.get("target_agent")
    if not target_agent_id:
        raise AgentToolExecutionError("handoff_agent exige target_agent.")

    target_agent = get_agent(target_agent_id)
    if not target_agent:
        raise AgentToolExecutionError(f"Agente de destino '{target_agent_id}' não encontrado.")

    register_jarvis_event(
        event_type="agent_handoff_requested",
        source="agent_tools_service",
        actor=agent.get("id"),
        lead=context.get("lead", {}),
        metadata={
            "from_agent": agent.get("id"),
            "to_agent": target_agent_id,
            "lead_id": context.get("lead", {}).get("id"),
        },
        module="agent_tools_service",
    )

    return {
        "ok": True,
        "tool": "handoff_agent",
        "from_agent": agent.get("id"),
        "to_agent": target_agent_id,
    }


def _tool_read_sheet(agent: Dict[str, Any], context: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_tool_allowed(agent, "read_sheet")

    register_jarvis_event(
        event_type="agent_tool_executed",
        source="agent_tools_service",
        actor=agent.get("id"),
        lead=context.get("lead", {}),
        metadata={
            "tool": "read_sheet",
            "sheet_id": payload.get("sheet_id"),
            "range": payload.get("range"),
            "status": "stub",
        },
        module="agent_tools_service",
    )

    return {
        "ok": True,
        "tool": "read_sheet",
        "status": "stub",
        "message": "Integração Google Sheets ainda não implementada nesta fase.",
    }


TOOLS_MAP: Dict[str, Callable[[Dict[str, Any], Dict[str, Any], Dict[str, Any]], Dict[str, Any]]] = {
    "send_whatsapp": _tool_send_whatsapp,
    "send_sms": _tool_send_sms,
    "add_tag": _tool_add_tag,
    "append_note": _tool_append_note,
    "move_lead": _tool_move_lead,
    "handoff_agent": _tool_handoff_agent,
    "read_sheet": _tool_read_sheet,
}


def execute_tool(
    *,
    agent: Dict[str, Any],
    context: Dict[str, Any],
    tool_name: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    tool = TOOLS_MAP.get(tool_name)
    if not tool:
        raise AgentToolExecutionError(f"Ferramenta '{tool_name}' não existe.")

    return tool(agent, context, payload)