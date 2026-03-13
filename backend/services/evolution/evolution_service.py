from __future__ import annotations

import asyncio
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

EVOLUTION_BASE_URL = os.getenv("EVOLUTION_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "").strip()


def _build_headers():
    headers = {
        "Content-Type": "application/json",
    }

    if EVOLUTION_API_KEY:
        headers["apikey"] = EVOLUTION_API_KEY

    return headers


def normalize_instances(raw_instances):
    normalized = []

    for item in raw_instances:
        instance_name = (
            item.get("name")
            or item.get("instance")
            or item.get("instanceName")
            or item.get("instance_name")
            or "Sem nome"
        )

        instance_id = (
            item.get("id")
            or item.get("instanceId")
            or item.get("name")
            or instance_name
        )

        status = (
            item.get("connectionStatus")
            or item.get("status")
            or item.get("state")
            or "unknown"
        )

        normalized.append({
            "id": str(instance_id),
            "name": instance_name,
            "status": str(status).lower(),
            "number": item.get("ownerJid") or item.get("number") or "",
            "profileName": item.get("profileName") or item.get("profile") or "",
            "raw": item,
        })

    return normalized


async def get_all_instances():
    url = f"{EVOLUTION_BASE_URL}/instance/fetchInstances"

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, headers=_build_headers())
        response.raise_for_status()
        data = response.json()

    if isinstance(data, list):
        return normalize_instances(data)

    if isinstance(data, dict):
        if isinstance(data.get("data"), list):
            return normalize_instances(data["data"])
        if isinstance(data.get("instances"), list):
            return normalize_instances(data["instances"])

    return []


async def get_instance_status(instance_name: str):
    if not instance_name:
        raise ValueError("instance_name é obrigatório")

    instances = await get_all_instances()

    target = next(
        (item for item in instances if str(item.get("name", "")).lower() == instance_name.lower()),
        None
    )

    if not target:
        return {
            "ok": False,
            "instance_name": instance_name,
            "found": False,
            "status": "not_found",
        }

    return {
        "ok": True,
        "instance_name": target["name"],
        "found": True,
        "status": target.get("status", "unknown"),
        "instance": target,
    }


async def send_text_message(instance_name: str, phone: str, text: str):
    if not instance_name:
        raise ValueError("instance_name é obrigatório")

    if not phone:
        raise ValueError("phone é obrigatório")

    if not text:
        raise ValueError("text é obrigatório")

    clean_phone = "".join(ch for ch in str(phone) if ch.isdigit())

    url = f"{EVOLUTION_BASE_URL}/message/sendText/{instance_name}"
    payload = {
        "number": clean_phone,
        "text": text,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=_build_headers(), json=payload)
        response.raise_for_status()
        data = response.json()

    return {
        "ok": True,
        "instance_name": instance_name,
        "phone": clean_phone,
        "text": text,
        "provider_response": data,
    }


def send_text_message_sync(instance_name: str, phone: str, text: str):
    """
    Wrapper síncrono para uso dentro do runtime/tools atual.
    """
    return asyncio.run(send_text_message(instance_name=instance_name, phone=phone, text=text))