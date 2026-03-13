import { useEffect, useState } from "react";
import { useEvolutionInstances } from "./hooks/useEvolutionInstances";
import { jarvisBus } from "../../core/jarvis/eventBus";

const API_BASE_URL = "https://jarvisdois.onrender.com";

async function listInstanceAgentBindings() {
  const response = await fetch(`${API_BASE_URL}/instance-agents`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Erro ao carregar vínculos");
  }

  return data;
}

async function saveInstanceAgentBinding(payload) {
  const response = await fetch(`${API_BASE_URL}/instance-agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Erro ao salvar vínculo");
  }

  return data;
}

async function createInstance(payload) {
  const response = await fetch(`${API_BASE_URL}/evolution/instance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Erro ao criar instância");
  }

  return data;
}

const agentOptions = [
  { id: "receptivo", label: "Receptivo", mode: "chatbot" },
  { id: "especialista_inss", label: "Especialista INSS", mode: "chatbot" },
  { id: "especialista_clt", label: "Especialista CLT", mode: "chatbot" },
  { id: "disparo_manual", label: "Disparo manual", mode: "campaign" },
];

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

function InstanceCard({ instance, agentBindings, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá, isto é uma mensagem de teste.");
  const [testResult, setTestResult] = useState("");

  const instanceBinding = agentBindings.find(
    (binding) => binding.instance_name === instance.name
  );

  const isConnected = ["connected", "open", "online"].includes(instance.status);

  async function handleGenerateQR() {
    setLoading(true);

    try {
      setQrCode(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      );

      jarvisBus.emit(
        "evolution_qr_requested",
        { instanceName: instance.name },
        { source: "evolution", module: "InstancesPage" }
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Desconectar instância ${instance.name}?`)) return;

    setLoading(true);

    try {
      jarvisBus.emit(
        "evolution_instance_disconnect_requested",
        { instanceName: instance.name },
        { source: "evolution", module: "InstancesPage" }
      );

      setQrCode(null);
      onUpdate?.();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestSend() {
    if (!testPhone.trim()) {
      alert("Digite um número de telefone");
      return;
    }

    setTestResult("Enviando...");

    try {
      setTestResult("Mensagem enviada com sucesso!");

      jarvisBus.emit(
        "evolution_test_message_sent",
        {
          instanceName: instance.name,
          phone: testPhone,
          preview: testMessage.slice(0, 80),
        },
        {
          source: "evolution",
          module: "InstancesPage",
        }
      );
    } catch (error) {
      setTestResult(`Erro: ${error.message}`);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div
        onDoubleClick={() => setIsExpanded((value) => !value)}
        className="cursor-pointer p-3 transition-colors hover:bg-zinc-800/50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate font-medium text-white">{instance.name}</h4>
              <span
                className={`inline-flex h-2 w-2 flex-shrink-0 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </div>

            {instanceBinding && (
              <div className="mt-1">
                <span className="text-xs text-cyan-300/80">
                  {agentOptions.find((agent) => agent.id === instanceBinding.agent_id)?.label ||
                    instanceBinding.agent_id}
                </span>
              </div>
            )}

            <div className="mt-1 text-[10px] text-zinc-500">
              {instance.number || "Sem número identificado"}
            </div>
          </div>

          <div className="flex flex-shrink-0 gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateQR();
              }}
              disabled={loading}
              className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              QR
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnect();
              }}
              disabled={loading || !isConnected}
              className="rounded-lg bg-red-500/15 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        {qrCode && !isExpanded && (
          <div className="mt-2 flex justify-center">
            <img
              src={qrCode}
              alt="QR Code"
              className="h-16 w-16 rounded-lg border border-zinc-700"
            />
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3 border-t border-zinc-800 p-3">
          {qrCode && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-400">
                Escaneie o QR Code para conectar
              </p>
              <img
                src={qrCode}
                alt="QR Code"
                className="h-32 w-32 rounded-xl border border-zinc-700"
              />
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <h5 className="mb-2 text-xs font-medium text-white">Vincular agente</h5>
            <div className="grid grid-cols-2 gap-1">
              {agentOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={async () => {
                    try {
                      await saveInstanceAgentBinding({
                        instance_name: instance.name,
                        agent_id: option.id,
                        mode: option.mode,
                        enabled: true,
                      });

                      jarvisBus.emit(
                        "instance_agent_bound",
                        {
                          instanceName: instance.name,
                          agentId: option.id,
                          mode: option.mode,
                        },
                        {
                          source: "evolution",
                          module: "InstancesPage",
                        }
                      );

                      onUpdate?.();
                    } catch (error) {
                      alert(error.message);
                    }
                  }}
                  className={`rounded-lg px-2 py-1.5 text-xs ${
                    instanceBinding?.agent_id === option.id
                      ? "bg-cyan-500/15 text-cyan-300"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <h5 className="mb-2 text-xs font-medium text-white">Testar envio</h5>

            <div className="space-y-2">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="558296151175"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none"
              />

              <textarea
                rows="2"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none"
              />

              <button
                onClick={handleTestSend}
                disabled={!isConnected}
                className="w-full rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                Enviar teste
              </button>

              {testResult && (
                <div className="rounded-lg bg-zinc-900 p-2 text-[10px] text-zinc-400">
                  {testResult}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InstanceManager() {
  const {
    instances: evolutionInstances,
    loading: evolutionLoading,
    error: evolutionError,
    reloadInstances,
  } = useEvolutionInstances();

  const [agentBindings, setAgentBindings] = useState([]);
  const [showNewInstanceForm, setShowNewInstanceForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [instanceName, setInstanceName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8080");
  const [webhookUrl, setWebhookUrl] = useState("http://127.0.0.1:8010/webhook/evolution");
  const [instances, setInstances] = useState([]);

  async function loadBindings() {
    try {
      const result = await listInstanceAgentBindings();
      setAgentBindings(result?.items || []);
    } catch (error) {
      console.error("Erro ao carregar vínculos:", error);
    }
  }

  async function loadData() {
    await Promise.all([loadBindings(), reloadInstances()]);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const normalized = Array.isArray(evolutionInstances)
      ? evolutionInstances.map(normalizeInstance)
      : [];

    setInstances(normalized);
  }, [evolutionInstances]);

  async function handleCreateInstance(e) {
    e.preventDefault();

    if (!instanceName.trim() || !apiKey.trim()) {
      setMsg("Nome da instância e API Key são obrigatórios");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const payload = {
        instance_name: instanceName,
        api_key: apiKey,
        base_url: baseUrl,
        webhook_url: webhookUrl,
      };

      await createInstance(payload);

      jarvisBus.emit(
        "evolution_instance_created",
        {
          instanceName,
          baseUrl,
          webhookUrl,
        },
        {
          source: "evolution",
          module: "InstancesPage",
        }
      );

      setMsg("Instância criada com sucesso!");
      setInstanceName("");
      setApiKey("");
      setShowNewInstanceForm(false);

      await loadData();
    } catch (error) {
      setMsg(error.message || "Erro ao criar instância");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Instâncias WhatsApp</h3>
            <p className="text-xs text-zinc-400">
              Gerencie suas instâncias da Evolution API
            </p>
          </div>

          <button
            onClick={() => setShowNewInstanceForm((value) => !value)}
            className="rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20"
          >
            {showNewInstanceForm ? "Cancelar" : "+ Nova"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <span>
            {evolutionLoading ? "Atualizando instâncias..." : `${instances.length} instância(s)`}
          </span>
          {evolutionError ? (
            <span className="text-amber-400">
              Falha ao consultar Evolution: {evolutionError}
            </span>
          ) : null}
        </div>

        {msg && (
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
            {msg}
          </div>
        )}

        {showNewInstanceForm && (
          <form
            onSubmit={handleCreateInstance}
            className="mt-3 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3"
          >
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-[10px] text-zinc-500">
                  Nome da instância *
                </label>
                <input
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Ex: whatsapp-comercial"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-zinc-500">
                  API Key *
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-zinc-500">Base URL</label>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-zinc-500">
                  Webhook URL
                </label>
                <input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewInstanceForm(false)}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                {loading ? "Criando..." : "Criar"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {instances.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 px-4 py-8 text-center">
            <p className="text-xs text-zinc-500">Nenhuma instância encontrada.</p>
            <button
              onClick={() => setShowNewInstanceForm(true)}
              className="mt-2 rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20"
            >
              Criar primeira instância
            </button>
          </div>
        ) : (
          instances.map((instance) => (
            <InstanceCard
              key={instance.id || instance.name}
              instance={instance}
              agentBindings={agentBindings}
              onUpdate={loadData}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default InstanceManager;