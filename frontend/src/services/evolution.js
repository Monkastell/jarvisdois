const API_BASE_URL = "http://127.0.0.1:8010";

function normalizeInstance(instance) {
  return {
    id: instance.id || instance.name,
    name: instance.name || "Sem nome",
    status: String(
      instance.status || instance.connectionStatus || "disconnected"
    ).toLowerCase(),
    connectionStatus: String(
      instance.connectionStatus || instance.status || "disconnected"
    ).toLowerCase(),
    number: instance.number || instance.ownerJid || "",
    profileName: instance.profileName || "",
    raw: instance,
  };
}

async function parseResponse(response, defaultMessage) {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.error || defaultMessage || "Erro na requisição"
    );
  }

  return data;
}

export async function getEvolutionInstances() {
  const response = await fetch(`${API_BASE_URL}/evolution/instances`);
  const data = await parseResponse(response, "Erro ao buscar instâncias da Evolution");

  const items = Array.isArray(data?.instances)
    ? data.instances
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];

  return items.map(normalizeInstance);
}

export async function getInstanceStatus(instanceName) {
  if (!instanceName) {
    throw new Error("instanceName é obrigatório");
  }

  const response = await fetch(
    `${API_BASE_URL}/evolution/instance/status?instance_name=${encodeURIComponent(instanceName)}`
  );

  return await parseResponse(response, "Erro ao consultar status da instância");
}

export async function sendMessageViaInstance(instanceName, phone, text) {
  if (!instanceName) {
    throw new Error("instanceName é obrigatório");
  }

  if (!phone) {
    throw new Error("phone é obrigatório");
  }

  if (!text) {
    throw new Error("text é obrigatório");
  }

  const response = await fetch(`${API_BASE_URL}/evolution/message/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instance_name: instanceName,
      phone,
      text,
    }),
  });

  return await parseResponse(response, "Erro ao enviar mensagem pela instância");
}