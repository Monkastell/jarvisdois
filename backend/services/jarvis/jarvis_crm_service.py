from services.jarvis.jarvis_event_service import register_jarvis_event
from services.jarvis.jarvis_decision_service import decide_next_action


def process_crm_event(payload: dict):
    lead = payload.get("lead") or {}
    previous = payload.get("previous") or {}
    origin = payload.get("origin", "crm")
    actor = payload.get("actor", "crm")
    meta = payload.get("meta") or {}

    event = register_jarvis_event(
        event_type="crm_update",
        origin=origin,
        actor=actor,
        lead=lead,
        previous=previous,
        meta=meta,
        module="jarvis_crm_service"
    )

    decision = decide_next_action(
        lead=lead,
        previous=previous,
        origin=origin,
    )

    override_event = None

    if decision.get("action") == "manual_override_detected":
        override_event = register_jarvis_event(
            event_type="manual_override_detected",
            origin=origin,
            actor=actor,
            lead=lead,
            previous=previous,
            meta={
                **meta,
                "reason": decision.get("reason"),
                "from_status": previous.get("status"),
                "to_status": lead.get("status"),
            },
            module="jarvis_crm_service"
        )

    return {
        "event": event,
        "override_event": override_event,
        "decision": decision,
    }


def process_incoming_whatsapp_response(payload: dict):
    """
    Ponte provisória entre webhook da Evolution e o ecossistema do Jarvis.

    Hoje não cria lead direto no Firebase porque a persistência do CRM ainda
    está no frontend. Então aqui registramos a intenção e deixamos o fluxo
    preparado para a próxima etapa.
    """
    phone = payload.get("phone", "")
    message = payload.get("message", "")
    instance = payload.get("instance", "")
    remote_jid = payload.get("remote_jid", "")

    event = register_jarvis_event(
        event_type="incoming_whatsapp_response_registered",
        origin="evolution_webhook",
        actor="jarvis",
        lead={
            "telefone": phone,
            "origem": "whatsapp",
            "status": "novos",
        },
        meta={
            "phone": phone,
            "message": message,
            "instance": instance,
            "remote_jid": remote_jid,
            "pending_crm_integration": True,
        },
        module="jarvis_crm_service",
    )

    return {
        "ok": True,
        "event": event,
        "phone": phone,
        "message": message,
        "instance": instance,
        "pending_crm_integration": True,
    }