from __future__ import annotations

from typing import Any, Dict, List


TOOL_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "key": "send_whatsapp",
        "label": "Enviar WhatsApp",
        "description": "Envia mensagem via Evolution.",
        "category": "communication",
        "requires": ["instance_name", "phone", "message"],
    },
    {
        "key": "send_sms",
        "label": "Enviar SMS",
        "description": "Envia SMS via AirMore.",
        "category": "communication",
        "requires": ["phone", "message"],
    },
    {
        "key": "add_tag",
        "label": "Adicionar Tag",
        "description": "Adiciona uma tag lógica ao lead.",
        "category": "crm",
        "requires": ["tag"],
    },
    {
        "key": "append_note",
        "label": "Adicionar Nota",
        "description": "Registra nota operacional no lead.",
        "category": "crm",
        "requires": ["note"],
    },
    {
        "key": "move_lead",
        "label": "Mover Lead",
        "description": "Solicita movimentação do lead no funil.",
        "category": "crm",
        "requires": ["target_column"],
    },
    {
        "key": "handoff_agent",
        "label": "Handoff de Agente",
        "description": "Entrega o lead para outro agente.",
        "category": "orchestration",
        "requires": ["target_agent"],
    },
    {
        "key": "read_sheet",
        "label": "Ler Google Sheets",
        "description": "Consulta planilha autorizada.",
        "category": "data",
        "requires": ["sheet_id"],
    },
    {
        "key": "chatbot_reply",
        "label": "Resposta de Chatbot",
        "description": "Gera resposta conversacional do agente.",
        "category": "ai",
        "requires": ["message"],
        "available": False,
    },
]


CHANNEL_DEFINITIONS: List[Dict[str, Any]] = [
    {"key": "whatsapp", "label": "WhatsApp"},
    {"key": "sms", "label": "SMS"},
]


STATUS_OPTIONS = [
    {"key": "active", "label": "Ativo"},
    {"key": "inactive", "label": "Inativo"},
    {"key": "disabled", "label": "Desativado"},
]


AGENT_TYPE_OPTIONS = [
    {"key": "generic", "label": "Genérico"},
    {"key": "receptivo", "label": "Receptivo"},
    {"key": "negociador", "label": "Negociador"},
    {"key": "followup", "label": "Follow-up"},
    {"key": "acompanhamento", "label": "Acompanhamento"},
    {"key": "ativo", "label": "Ativo"},
    {"key": "unico", "label": "Único"},
]


HANDOFF_CONDITIONS = [
    {"key": "cliente_interessado", "label": "Cliente interessado"},
    {"key": "cliente_sem_interesse", "label": "Cliente sem interesse"},
    {"key": "cliente_pediu_proposta", "label": "Cliente pediu proposta"},
    {"key": "cliente_pediu_humano", "label": "Cliente pediu humano"},
]


def get_agent_builder_schema() -> Dict[str, Any]:
    return {
        "ok": True,
        "schema_version": 1,
        "entity": "agent",
        "builder": {
            "sections": [
                {
                    "id": "identity",
                    "label": "Identidade",
                    "fields": [
                        {
                            "name": "id",
                            "type": "text",
                            "label": "ID do agente",
                            "required": True,
                            "placeholder": "ex: receptivo",
                        },
                        {
                            "name": "name",
                            "type": "text",
                            "label": "Nome",
                            "required": True,
                            "placeholder": "ex: Agente Receptivo",
                        },
                        {
                            "name": "type",
                            "type": "select",
                            "label": "Tipo",
                            "required": True,
                            "options": AGENT_TYPE_OPTIONS,
                        },
                        {
                            "name": "description",
                            "type": "textarea",
                            "label": "Descrição",
                            "required": False,
                            "placeholder": "Descreva o papel do agente",
                        },
                    ],
                },
                {
                    "id": "behavior",
                    "label": "Comportamento",
                    "fields": [
                        {
                            "name": "status",
                            "type": "select",
                            "label": "Status",
                            "required": True,
                            "options": STATUS_OPTIONS,
                        },
                        {
                            "name": "llm_enabled",
                            "type": "switch",
                            "label": "LLM habilitada",
                            "required": True,
                        },
                    ],
                },
                {
                    "id": "listening",
                    "label": "Canais escutados",
                    "fields": [
                        {
                            "name": "listening.whatsapp",
                            "type": "switch",
                            "label": "Escuta WhatsApp",
                            "required": True,
                        },
                        {
                            "name": "listening.sms",
                            "type": "switch",
                            "label": "Escuta SMS",
                            "required": True,
                        },
                    ],
                },
                {
                    "id": "tools",
                    "label": "Ferramentas autorizadas",
                    "fields": [
                        {
                            "name": "allowed_tools",
                            "type": "multiselect",
                            "label": "Ferramentas",
                            "required": True,
                            "options": TOOL_DEFINITIONS,
                        }
                    ],
                },
                {
                    "id": "handoff",
                    "label": "Regras de handoff",
                    "fields": [
                        {
                            "name": "handoff_rules",
                            "type": "rule_builder",
                            "label": "Regras",
                            "required": False,
                            "conditions": HANDOFF_CONDITIONS,
                            "target_entity": "agent",
                        }
                    ],
                },
                {
                    "id": "metadata",
                    "label": "Metadados",
                    "fields": [
                        {
                            "name": "metadata.version",
                            "type": "number",
                            "label": "Versão",
                            "required": False,
                        },
                        {
                            "name": "metadata.created_by",
                            "type": "text",
                            "label": "Criado por",
                            "required": False,
                        },
                    ],
                },
            ]
        },
        "options": {
            "tools": TOOL_DEFINITIONS,
            "channels": CHANNEL_DEFINITIONS,
            "statuses": STATUS_OPTIONS,
            "agent_types": AGENT_TYPE_OPTIONS,
            "handoff_conditions": HANDOFF_CONDITIONS,
        },
        "defaults": {
            "id": "",
            "name": "",
            "type": "generic",
            "description": "",
            "status": "active",
            "llm_enabled": False,
            "allowed_tools": [],
            "listening": {
                "whatsapp": False,
                "sms": False,
            },
            "handoff_rules": [],
            "metadata": {
                "version": 1,
                "created_by": "user",
            },
        },
    }