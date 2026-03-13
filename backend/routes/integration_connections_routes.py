import json
import time

import requests
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Integration Connections"])


class ApiConfigPayload(BaseModel):
    baseUrl: str = ""
    authType: str = "none"
    apiKey: str = ""
    defaultHeaders: str = ""
    testRoute: str = ""
    timeoutMs: int = 10000


class WebhookConfigPayload(BaseModel):
    enabled: bool = False
    internalEndpoint: str = ""
    externalWebhookUrl: str = ""
    events: list[str] = []
    secret: str = ""
    validateOrigin: bool = False


class IntegrationConnectionTestPayload(BaseModel):
    program: str
    name: str = ""
    apiConfig: ApiConfigPayload
    webhookConfig: WebhookConfigPayload | None = None


def build_headers(api_config: ApiConfigPayload):
    headers = {
        "Content-Type": "application/json",
    }

    auth_type = (api_config.authType or "none").lower().strip()
    api_key = (api_config.apiKey or "").strip()

    if auth_type == "bearer" and api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    elif auth_type == "apikey" and api_key:
        headers["apikey"] = api_key

    if api_config.defaultHeaders:
        try:
            extra_headers = json.loads(api_config.defaultHeaders)
            if isinstance(extra_headers, dict):
                headers.update(extra_headers)
        except Exception:
            pass

    return headers


def normalize_url(base_url: str, route: str):
    base = (base_url or "").strip().rstrip("/")
    path = (route or "").strip()

    if not path:
        return base

    if not path.startswith("/"):
        path = f"/{path}"

    return f"{base}{path}"


@router.post("/integration-connections/test")
def test_integration_connection(payload: IntegrationConnectionTestPayload):
    program = (payload.program or "").strip().lower()
    api_config = payload.apiConfig

    if not api_config.baseUrl.strip():
        return {
            "ok": False,
            "error": "Base URL não informada.",
            "httpStatus": None,
            "latencyMs": None,
        }

    headers = build_headers(api_config)
    timeout_seconds = max(3, int(api_config.timeoutMs / 1000))

    if program == "evolution":
        route = api_config.testRoute or "/manager/instance/fetchInstances"
        url = normalize_url(api_config.baseUrl, route)

        started = time.perf_counter()

        try:
            response = requests.get(url, headers=headers, timeout=timeout_seconds)
            latency_ms = int((time.perf_counter() - started) * 1000)

            if 200 <= response.status_code < 300:
                parsed = None
                try:
                    parsed = response.json()
                except Exception:
                    parsed = {"raw": response.text[:500]}

                return {
                    "ok": True,
                    "program": program,
                    "httpStatus": response.status_code,
                    "latencyMs": latency_ms,
                    "url": url,
                    "preview": parsed,
                }

            return {
                "ok": False,
                "program": program,
                "error": f"Evolution respondeu com status {response.status_code}",
                "httpStatus": response.status_code,
                "latencyMs": latency_ms,
                "url": url,
            }

        except requests.RequestException as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return {
                "ok": False,
                "program": program,
                "error": f"Falha ao acessar Evolution: {str(exc)}",
                "httpStatus": None,
                "latencyMs": latency_ms,
                "url": url,
            }

    if program == "airmore":
        route = api_config.testRoute or "/status"
        url = normalize_url(api_config.baseUrl, route)

        started = time.perf_counter()

        try:
            response = requests.get(url, headers=headers, timeout=timeout_seconds)
            latency_ms = int((time.perf_counter() - started) * 1000)

            if 200 <= response.status_code < 300:
                parsed = None
                try:
                    parsed = response.json()
                except Exception:
                    parsed = {"raw": response.text[:500]}

                return {
                    "ok": True,
                    "program": program,
                    "httpStatus": response.status_code,
                    "latencyMs": latency_ms,
                    "url": url,
                    "preview": parsed,
                }

            return {
                "ok": False,
                "program": program,
                "error": f"AirMore respondeu com status {response.status_code}",
                "httpStatus": response.status_code,
                "latencyMs": latency_ms,
                "url": url,
            }

        except requests.RequestException as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            return {
                "ok": False,
                "program": program,
                "error": f"Falha ao acessar AirMore: {str(exc)}",
                "httpStatus": None,
                "latencyMs": latency_ms,
                "url": url,
            }

    return {
        "ok": False,
        "program": program,
        "error": f"Programa '{program}' ainda não possui rotina de teste implementada.",
        "httpStatus": None,
        "latencyMs": None,
    }