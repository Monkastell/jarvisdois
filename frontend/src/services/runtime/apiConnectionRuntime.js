const API_BASE_URL = "http://127.0.0.1:8010";

export async function testApiConnection(connection) {
  const response = await fetch(`${API_BASE_URL}/integration-connections/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      program: connection.program,
      name: connection.name,
      apiConfig: connection.apiConfig || {},
      webhookConfig: connection.webhookConfig || {},
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Erro ao testar conexão");
  }

  return data;
}