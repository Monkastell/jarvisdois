from fastapi import APIRouter, Request
import logging

from services.jarvis.jarvis_crm_service import process_incoming_whatsapp_response
from services.jarvis.jarvis_event_service import dispatch_jarvis_event
from services.prospeccao.whatsapp_disparo_service import mark_contact_responded

router = APIRouter(prefix="/webhook", tags=["Webhook"])
logger = logging.getLogger(__name__)


@router.post("/evolution")
async def evolution_webhook(request: Request):
    try:
        payload = await request.json()
        logger.info(f"[WEBHOOK_EVOLUTION] Recebido: {payload}")

        data = payload.get("data", {})
        event_type = payload.get("event", "")

        if event_type not in ["messages.upsert", "message.create"]:
            return {"ok": True, "processed": False, "reason": "ignored_event"}

        message = data.get("message", {})
        key = data.get("key", {})

        is_from_me = key.get("fromMe", False)
        if is_from_me:
            return {"ok": True, "processed": False, "reason": "self_message"}

        remote_jid = key.get("remoteJid", "")
        if not remote_jid:
            return {"ok": True, "processed": False, "reason": "no_remote_jid"}

        phone = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid

        message_text = ""
        if message.get("conversation"):
            message_text = message["conversation"]
        elif message.get("extendedTextMessage", {}).get("text"):
            message_text = message["extendedTextMessage"]["text"]

        dispatch_payload = dispatch_jarvis_event(
            event_type="whatsapp_message_received",
            origin="evolution_webhook",
            actor="whatsapp",
            meta={
                "phone": phone,
                "message": message_text,
                "remote_jid": remote_jid,
                "instance": data.get("instance", "unknown"),
                "full_payload": payload,
                "channel": "whatsapp",
            },
            module="webhook_routes",
            auto_dispatch=True,
        )

        crm_result = process_incoming_whatsapp_response(
            {
                "phone": phone,
                "message": message_text,
                "remote_jid": remote_jid,
                "instance": data.get("instance", "unknown"),
            }
        )

        reply_match = await mark_contact_responded(phone=phone, message_text=message_text)

        logger.info(f"[WEBHOOK_EVOLUTION] Mensagem processada - Telefone: {phone}")

        return {
            "ok": True,
            "processed": True,
            "dispatch": dispatch_payload,
            "crm_result": crm_result,
            "reply_match": reply_match,
        }

    except Exception as e:
        logger.error(f"[WEBHOOK_EVOLUTION] Erro: {str(e)}")

        dispatch_jarvis_event(
            event_type="webhook_error",
            origin="evolution_webhook",
            actor="system",
            meta={"error": str(e), "channel": "whatsapp"},
            module="webhook_routes",
        )

        return {"ok": False, "error": str(e)}