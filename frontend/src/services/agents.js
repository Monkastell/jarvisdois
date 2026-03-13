const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "https://jarvisdois.onrender.com";

const STORAGE_KEY = "jarvis_agent_configs_v1";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "Erro na requisição.");
  }

  return data;
}

/* =========================
   API DE AGENTES (BACKEND)
========================= */

export async function getAgentBuilderSchema() {
  const response = await fetch(`${API_BASE_URL}/agents/builder/schema`);
  return parseResponse(response);
}

export async function listAgents(includeDisabled = true) {
  const response = await fetch(
    `${API_BASE_URL}/agents?include_disabled=${includeDisabled ? "true" : "false"}`
  );
  return parseResponse(response);
}

export async function getAgent(agentId) {
  const response = await fetch(`${API_BASE_URL}/agents/${agentId}`);
  return parseResponse(response);
}

export async function createAgent(payload) {
  const response = await fetch(`${API_BASE_URL}/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function updateAgent(agentId, payload) {
  const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function setAgentStatus(agentId, status) {
  const response = await fetch(`${API_BASE_URL}/agents/${agentId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return parseResponse(response);
}

export async function runAgent(agentId, payload) {
  const response = await fetch(`${API_BASE_URL}/agents/${agentId}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

/* =========================
   COMPATIBILIDADE LEGADA
   (WhatsAppDisparoModal / bindings locais)
========================= */

export async function loadAgentConfig(agentId) {
  if (!agentId) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    if (parsed && typeof parsed === "object") {
      return parsed[agentId] || null;
    }

    return null;
  } catch (error) {
    console.error("Erro ao carregar config do agente:", error);
    return null;
  }
}

export async function saveAgentConfig(agentId, config) {
  if (!agentId) {
    throw new Error("agentId é obrigatório");
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    const next = {
      ...parsed,
      [agentId]: {
        ...(parsed?.[agentId] || {}),
        ...(config || {}),
        updatedAt: Date.now(),
      },
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next[agentId];
  } catch (error) {
    console.error("Erro ao salvar config do agente:", error);
    throw error;
  }
}

export async function listAgentConfigs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Erro ao listar configs dos agentes:", error);
    return {};
  }
}