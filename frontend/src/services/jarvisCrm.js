const API_BASE_URL = "http://127.0.0.1:8010";

export async function notifyJarvisLeadEvent({ eventType, lead, previous = null }) {
  const response = await fetch(`${API_BASE_URL}/crm/lead-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_type: eventType,
      lead,
      previous,
    }),
  });

  if (!response.ok) {
    throw new Error("Falha ao notificar o Jarvis sobre o lead.");
  }

  return response.json();
}