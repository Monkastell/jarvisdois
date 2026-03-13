import { jarvisBus } from "../../core/jarvis/eventBus";

const API_BASE_URL = "http://127.0.0.1:8010";

export async function fetchEvolutionInstances() {
  const response = await fetch(`${API_BASE_URL}/evolution/instances`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    jarvisBus.emit(
      "evolution_instances_fetch_failed",
      {
        status: response.status,
        error: data?.detail || data?.error || "Erro ao buscar instâncias do Evolution",
      },
      {
        source: "frontend",
        module: "evolutionApi",
      }
    );

    throw new Error(data?.detail || data?.error || "Erro ao buscar instâncias do Evolution");
  }

  jarvisBus.emit(
    "evolution_instances_fetched",
    {
      total: data.total || 0,
      active: data.active || 0,
    },
    {
      source: "frontend",
      module: "evolutionApi",
    }
  );

  return data;
}