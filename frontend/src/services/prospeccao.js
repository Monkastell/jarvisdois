const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8010";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "Erro na requisição.");
  }

  return data;
}

export async function listWhatsAppDisparos() {
  const response = await fetch(`${API_BASE_URL}/prospeccao/whatsapp/disparos`);
  return parseResponse(response);
}

export async function getWhatsAppDisparo(disparoId) {
  const response = await fetch(`${API_BASE_URL}/prospeccao/whatsapp/disparos/${disparoId}`);
  return parseResponse(response);
}

export async function createWhatsAppDisparo(payload) {
  const response = await fetch(`${API_BASE_URL}/prospeccao/whatsapp/disparos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function startWhatsAppDisparo(disparoId) {
  const response = await fetch(`${API_BASE_URL}/prospeccao/whatsapp/disparos/${disparoId}/start`, {
    method: "POST",
  });

  return parseResponse(response);
}

export async function pauseWhatsAppDisparo(disparoId) {
  const response = await fetch(`${API_BASE_URL}/prospeccao/whatsapp/disparos/${disparoId}/pause`, {
    method: "POST",
  });

  return parseResponse(response);
}

export async function resumeWhatsAppDisparo(disparoId) {
  const response = await fetch(`${API_BASE_URL}/prospeccao/whatsapp/disparos/${disparoId}/resume`, {
    method: "POST",
  });

  return parseResponse(response);
}

export async function deleteWhatsAppDisparo(disparoId) {
  const response = await fetch(`${API_BASE_URL}/prospeccao/whatsapp/disparos/${disparoId}`, {
    method: "DELETE",
  });

  return parseResponse(response);
}