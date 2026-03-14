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
    """
    Monta os headers de autenticação para a Evolution API v2.x.
    O padrão oficial para v2 com AUTHENTICATION_TYPE=apikey é o header 'apiKey'.
    """
    headers = {
        "Content-Type": "application/json",
    }
    if EVOLUTION_API_KEY:
        # Mudança crucial para v2: usar 'apiKey' em vez de 'globalApikey' ou 'apikey'
        headers["apiKey"] = EVOLUTION_API_KEY 
    return headers


def normalize_instances(raw_instances):
    normalized = []
    
    # Garante que estamos lidando com uma lista
    items = raw_instances if isinstance(raw_instances, list) else []

    for item in items:
        instance_data = item.get("instance", item) # v2 costuma encapsular em 'instance'
        
        instance_name = (
            instance_data.get("name")
            or instance_data.get("instanceName")
            or instance_data.get("instance_name")
            or "Sem nome"
        )

        instance_id = (
            instance_data.get("id")
            or instance_data.get("instanceId")
            or instance_name
        )

        status = (
            instance_data.get("status")
            or instance_data.get("connectionStatus")
            or instance_data.get("state")
            or "unknown"
        )

        normalized.append({
            "id": str(instance_id),
            "name": instance_name,
            "status": str(status).lower(),
            "number": instance_data.get("ownerJid") or instance_data.get("number") or "",
            "profileName": instance_data.get("profileName") or "",
            "raw": item,
        })

    return normalized


async def get_all_instances():
    url = f"{EVOLUTION_BASE_URL}/instance/fetchInstances"

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.get(url, headers=_build_headers())
            
            # Se ainda der 401, tentamos o fallback para 'apikey' minúsculo
            if response.status_code == 401:
                alt_headers = _build_headers()
                alt_headers["apikey"] = EVOLUTION_API_KEY
                del alt_headers["apiKey"]
                response = await client.get(url, headers=alt_headers)

            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"Erro ao buscar instâncias Evolution: {e}")
            return []

    # Na v2, o retorno costuma vir em uma lista direta ou dentro de um objeto
    if isinstance(data, list):
        return normalize_instances(data)
    
    if isinstance(data, dict):
        # Tenta chaves comuns de retorno da v2
        for key in ["data", "instances", "instance"]:
            if isinstance(data.get(key), list):
                return normalize_instances(data[key])
                
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
    return asyncio.run(send_text_message(instance_name=instance_name, phone=phone, text=text))