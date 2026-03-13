from __future__ import annotations

import asyncio
import json
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from services.evolution.evolution_service import send_text_message
from services.jarvis.jarvis_event_service import register_jarvis_event

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
STORE_FILE = DATA_DIR / "whatsapp_disparos.json"

_STORE_LOCK = asyncio.Lock()
_RUNTIME_TASKS: Dict[str, asyncio.Task] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_store() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not STORE_FILE.exists():
        STORE_FILE.write_text(
            json.dumps({"items": []}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def _read_store_sync() -> Dict[str, Any]:
    _ensure_store()
    try:
        raw = STORE_FILE.read_text(encoding="utf-8").strip()
        if not raw:
            return {"items": []}
        data = json.loads(raw)
        if not isinstance(data, dict):
            return {"items": []}
        if "items" not in data or not isinstance(data["items"], list):
            data["items"] = []
        return data
    except Exception:
        return {"items": []}


def _write_store_sync(data: Dict[str, Any]) -> None:
    _ensure_store()
    STORE_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


async def _read_store() -> Dict[str, Any]:
    async with _STORE_LOCK:
        return _read_store_sync()


async def _write_store(data: Dict[str, Any]) -> None:
    async with _STORE_LOCK:
        _write_store_sync(data)


def normalize_phone(value: str) -> str:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())

    if not digits:
        return ""

    if len(digits) in (10, 11):
        return f"55{digits}"

    if len(digits) in (12, 13) and digits.startswith("55"):
        return digits

    if len(digits) > 13 and digits.startswith("55"):
        return digits[:13]

    return digits


def parse_contacts_text(text: str) -> List[Dict[str, Any]]:
    contacts: List[Dict[str, Any]] = []

    for raw_line in str(text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue

        parts = [part.strip() for part in line.split(";")]

        if len(parts) == 1:
            phone = normalize_phone(parts[0])
            if not phone:
                continue
            contacts.append(
                {
                    "id": f"contact-{uuid4().hex[:10]}",
                    "nome": phone,
                    "telefone": phone,
                    "produto": "",
                    "matricula": "",
                    "variavel1": "",
                    "variavel2": "",
                    "status": "pending",
                    "enviado": False,
                    "respondido": False,
                    "instanciaUsada": None,
                    "tentativas": 0,
                    "erro": None,
                }
            )
            continue

        nome, telefone, *rest = parts
        produto = rest[0] if len(rest) > 0 else ""
        matricula = rest[1] if len(rest) > 1 else ""
        variavel1 = rest[2] if len(rest) > 2 else ""
        variavel2 = rest[3] if len(rest) > 3 else ""

        phone = normalize_phone(telefone)
        if not phone:
            continue

        contacts.append(
            {
                "id": f"contact-{uuid4().hex[:10]}",
                "nome": nome or phone,
                "telefone": phone,
                "produto": produto,
                "matricula": matricula,
                "variavel1": variavel1,
                "variavel2": variavel2,
                "status": "pending",
                "enviado": False,
                "respondido": False,
                "instanciaUsada": None,
                "tentativas": 0,
                "erro": None,
            }
        )

    return contacts


def render_template(template: str, contact: Dict[str, Any]) -> str:
    message = str(template or "")
    replacements = {
        "{nome}": contact.get("nome", ""),
        "{telefone}": contact.get("telefone", ""),
        "{produto}": contact.get("produto", ""),
        "{matricula}": contact.get("matricula", ""),
        "{variavel1}": contact.get("variavel1", ""),
        "{variavel2}": contact.get("variavel2", ""),
    }

    for key, value in replacements.items():
        message = message.replace(key, str(value or ""))

    return message.strip()


def _find_item_index(items: List[Dict[str, Any]], disparo_id: str) -> int:
    for index, item in enumerate(items):
        if item.get("id") == disparo_id:
            return index
    return -1


async def list_disparos() -> List[Dict[str, Any]]:
    data = await _read_store()
    return data.get("items", [])


async def get_disparo(disparo_id: str) -> Optional[Dict[str, Any]]:
    data = await _read_store()
    items = data.get("items", [])
    for item in items:
        if item.get("id") == disparo_id:
            return item
    return None


async def create_disparo(payload: Dict[str, Any]) -> Dict[str, Any]:
    contacts_text = payload.get("contacts_text", "")
    contacts = parse_contacts_text(contacts_text)

    instances = payload.get("instances", [])
    if not instances:
        raise ValueError("Selecione pelo menos uma instância.")

    if not contacts:
        raise ValueError("Nenhum contato válido foi identificado.")

    template = str(payload.get("template", "")).strip()
    if not template:
        raise ValueError("Template é obrigatório.")

    disparo = {
        "id": f"disparo-{uuid4().hex[:10]}",
        "name": str(payload.get("name") or "Disparo WhatsApp").strip(),
        "channel": "whatsapp",
        "status": "draft",
        "priority": str(payload.get("priority") or "media"),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "started_at": None,
        "finished_at": None,
        "instances": instances,
        "instance_bindings": dict(payload.get("instance_bindings") or {}),
        "selected_template_id": str(payload.get("selected_template_id") or ""),
        "templates_rotativos": list(payload.get("templates_rotativos") or []),
        "template": template,
        "typing_speed": int(payload.get("typing_speed") or 60),
        "delay_seconds": int(payload.get("delay_seconds") or 8),
        "delay_between_instances": int(payload.get("delay_between_instances") or 30),
        "current_index": 0,
        "contacts": contacts,
        "analytics": {
            "total": len(contacts),
            "sent": 0,
            "failed": 0,
            "responded": 0,
        },
        "logs": [],
    }

    data = await _read_store()
    items = data.get("items", [])
    items.append(disparo)
    data["items"] = items
    await _write_store(data)

    register_jarvis_event(
        event_type="whatsapp_disparo_created",
        origin="prospeccao",
        actor="operator",
        meta={
            "disparo_id": disparo["id"],
            "total": len(contacts),
            "instances": instances,
            "priority": disparo["priority"],
        },
        module="whatsapp_disparo_service",
    )

    return disparo


async def _update_disparo(disparo_id: str, updater) -> Dict[str, Any]:
    data = await _read_store()
    items = data.get("items", [])
    index = _find_item_index(items, disparo_id)

    if index < 0:
        raise ValueError("Disparo não encontrado.")

    current = deepcopy(items[index])
    updated = updater(current)
    updated["updated_at"] = _now_iso()
    items[index] = updated
    data["items"] = items
    await _write_store(data)
    return updated


async def start_disparo(disparo_id: str) -> Dict[str, Any]:
    disparo = await _update_disparo(
        disparo_id,
        lambda item: {
            **item,
            "status": "running",
            "started_at": item.get("started_at") or _now_iso(),
        },
    )
    _ensure_runtime_task(disparo_id)
    return disparo


async def pause_disparo(disparo_id: str) -> Dict[str, Any]:
    disparo = await _update_disparo(
        disparo_id,
        lambda item: {
            **item,
            "status": "paused",
        },
    )

    task = _RUNTIME_TASKS.get(disparo_id)
    if task and not task.done():
        task.cancel()

    return disparo


async def resume_disparo(disparo_id: str) -> Dict[str, Any]:
    disparo = await _update_disparo(
        disparo_id,
        lambda item: {
            **item,
            "status": "running",
        },
    )
    _ensure_runtime_task(disparo_id)
    return disparo


async def delete_disparo(disparo_id: str) -> Dict[str, Any]:
    data = await _read_store()
    items = data.get("items", [])
    index = _find_item_index(items, disparo_id)

    if index < 0:
        raise ValueError("Disparo não encontrado.")

    removed = items.pop(index)
    data["items"] = items
    await _write_store(data)

    task = _RUNTIME_TASKS.get(disparo_id)
    if task and not task.done():
        task.cancel()

    return {"ok": True, "item": removed}


async def mark_contact_responded(phone: str, message_text: str) -> Dict[str, Any]:
    normalized_phone = normalize_phone(phone)
    data = await _read_store()
    items = data.get("items", [])
    changed = 0

    for item in items:
        if item.get("channel") != "whatsapp":
            continue

        contacts = item.get("contacts", [])
        for contact in contacts:
            if normalize_phone(contact.get("telefone", "")) == normalized_phone:
                if not contact.get("respondido"):
                    contact["respondido"] = True
                    item["analytics"]["responded"] = int(item["analytics"].get("responded", 0)) + 1
                    item["logs"].append(
                        {
                            "at": _now_iso(),
                            "type": "incoming_reply",
                            "phone": normalized_phone,
                            "message": message_text,
                        }
                    )
                    changed += 1

    if changed:
        await _write_store(data)

    return {
        "ok": True,
        "normalized_phone": normalized_phone,
        "matches": changed,
    }


def _ensure_runtime_task(disparo_id: str) -> None:
    task = _RUNTIME_TASKS.get(disparo_id)
    if task and not task.done():
        return

    _RUNTIME_TASKS[disparo_id] = asyncio.create_task(_runner(disparo_id))


async def _runner(disparo_id: str) -> None:
    try:
        while True:
            disparo = await get_disparo(disparo_id)
            if not disparo:
                return

            if disparo.get("status") != "running":
                return

            contacts = disparo.get("contacts", [])
            current_index = int(disparo.get("current_index", 0))

            if current_index >= len(contacts):
                await _update_disparo(
                    disparo_id,
                    lambda item: {
                        **item,
                        "status": "completed",
                        "finished_at": _now_iso(),
                    },
                )
                return

            contact = contacts[current_index]
            instances = disparo.get("instances", [])
            if not instances:
                return

            instance_name = instances[current_index % len(instances)]
            message = render_template(disparo.get("template", ""), contact)

            try:
                result = await send_text_message(
                    instance_name=instance_name,
                    phone=contact.get("telefone", ""),
                    text=message,
                )

                def apply_success(item: Dict[str, Any]) -> Dict[str, Any]:
                    next_item = deepcopy(item)
                    next_contact = next_item["contacts"][current_index]
                    next_contact["status"] = "sent"
                    next_contact["enviado"] = True
                    next_contact["instanciaUsada"] = instance_name
                    next_contact["tentativas"] = int(next_contact.get("tentativas", 0)) + 1
                    next_contact["erro"] = None
                    next_item["current_index"] = current_index + 1
                    next_item["analytics"]["sent"] = int(next_item["analytics"].get("sent", 0)) + 1
                    next_item["logs"].append(
                        {
                            "at": _now_iso(),
                            "type": "sent",
                            "phone": next_contact.get("telefone"),
                            "instance": instance_name,
                            "result": result,
                        }
                    )
                    return next_item

                await _update_disparo(disparo_id, apply_success)

            except Exception as exc:
                def apply_error(item: Dict[str, Any]) -> Dict[str, Any]:
                    next_item = deepcopy(item)
                    next_contact = next_item["contacts"][current_index]
                    next_contact["status"] = "error"
                    next_contact["tentativas"] = int(next_contact.get("tentativas", 0)) + 1
                    next_contact["erro"] = str(exc)
                    next_item["current_index"] = current_index + 1
                    next_item["analytics"]["failed"] = int(next_item["analytics"].get("failed", 0)) + 1
                    next_item["logs"].append(
                        {
                            "at": _now_iso(),
                            "type": "error",
                            "phone": next_contact.get("telefone"),
                            "instance": instance_name,
                            "error": str(exc),
                        }
                    )
                    return next_item

                await _update_disparo(disparo_id, apply_error)

            await asyncio.sleep(max(int(disparo.get("delay_seconds", 8)), 1))

    except asyncio.CancelledError:
        return


async def resume_running_disparos_on_startup() -> None:
    data = await _read_store()
    items = data.get("items", [])

    for item in items:
        if item.get("status") == "running":
            _ensure_runtime_task(item.get("id"))