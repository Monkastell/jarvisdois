def decide_next_action(lead: dict, previous: dict | None = None, origin: str = "system"):
    previous = previous or {}

    current_status = lead.get("status")
    previous_status = previous.get("status")
    temperatura = lead.get("temperatura")
    marcadores = lead.get("marcadores", [])

    if origin == "human_manual" and previous_status and previous_status != current_status:
        return {
            "action": "manual_override_detected",
            "agent": "jarvis",
            "reason": f"Lead movido manualmente de '{previous_status}' para '{current_status}'.",
            "should_recalculate": True,
        }

    if current_status == "novo" and temperatura == "quente":
        return {
            "action": "assign_agent",
            "agent": "ativo",
            "reason": "Lead novo e quente.",
            "should_recalculate": False,
        }

    if current_status == "negociacao" and "sem_resposta" in marcadores:
        return {
            "action": "assign_agent",
            "agent": "followup",
            "reason": "Lead em negociação sem resposta.",
            "should_recalculate": False,
        }

    if "documentacao_pendente" in marcadores:
        return {
            "action": "assign_agent",
            "agent": "acompanhamento",
            "reason": "Lead com documentação pendente.",
            "should_recalculate": False,
        }

    return {
        "action": "none",
        "agent": None,
        "reason": "Nenhuma regra aplicada.",
        "should_recalculate": False,
    }