import { useEffect, useState } from "react";
import InstancesPage from "./InstancesPage"; // Importa o gerenciador de instâncias existente
import {
  getEvolutionPanel,
  saveEvolutionConfig,
  getCorrectEvolutionBaseUrl,
  getCorrectWebhookUrl,
} from "../../services/evolution"; // Ajuste o caminho se necessário

// Componente de Aba Simples (pode ser extraído para um componente compartilhado depois)
function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
        active
          ? "bg-cyan-500/15 text-cyan-300"
          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

export default function EvolutionModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("config"); // 'config' ou 'instances'
  const [config, setConfig] = useState({
    baseUrl: getCorrectEvolutionBaseUrl(),
    apiKey: "",
    instanceName: "",
    webhookUrl: getCorrectWebhookUrl(),
  });
  const [healthData, setHealthData] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Carrega os dados do painel ao abrir o modal
  useEffect(() => {
    if (open) {
      loadPanelData();
    }
  }, [open]);

  async function loadPanelData() {
    setLoading(true);
    setStatusMessage("");
    try {
      const data = await getEvolutionPanel();
      if (data.ok) {
        setConfig({
          baseUrl: data.config.baseUrl || getCorrectEvolutionBaseUrl(),
          apiKey: data.config.apiKey || "",
          instanceName: data.config.instanceName || "",
          webhookUrl: data.config.webhookUrl || getCorrectWebhookUrl(),
        });
        setHealthData(data.health);
      } else {
        setStatusMessage("Não foi possível carregar a configuração da Evolution.");
      }
    } catch (error) {
      setStatusMessage(error.message || "Erro ao carregar painel Evolution.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    setLoading(true);
    setStatusMessage("");
    try {
      const result = await saveEvolutionConfig(config);
      if (result.ok) {
        setStatusMessage("Configuração salva com sucesso!");
        // Recarrega os dados para mostrar o status do servidor com a nova config
        await loadPanelData();
      } else {
        setStatusMessage("Erro ao salvar configuração.");
      }
    } catch (error) {
      setStatusMessage(error.message || "Erro ao salvar configuração.");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(field, value) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div className="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold">Evolution API · Gerenciamento</h2>
            <p className="text-sm text-zinc-400">
              Configure a conexão e gerencie suas instâncias WhatsApp.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            Fechar
          </button>
        </div>

        {/* Abas de navegação */}
        <div className="flex gap-2 border-b border-zinc-800 px-6 py-3">
          <TabButton
            label="Configuração"
            active={activeTab === "config"}
            onClick={() => setActiveTab("config")}
          />
          <TabButton
            label="Instâncias"
            active={activeTab === "instances"}
            onClick={() => setActiveTab("instances")}
          />
        </div>

        {/* Área de Conteúdo - Scrollável */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "config" && (
            <div className="space-y-6">
              {/* Status do Servidor */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="mb-3 text-lg font-semibold">Status da Conexão</h3>
                {healthData ? (
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Servidor Evolution</span>
                      <span
                        className={
                          healthData.ok
                            ? "font-medium text-emerald-300"
                            : "font-medium text-rose-300"
                        }
                      >
                        {healthData.ok ? "Online" : "Offline"}
                      </span>
                    </div>
                    {healthData.data && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Status Code</span>
                          <span>{healthData.data.status_code || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Resposta</span>
                          <span className="truncate max-w-[300px]">{healthData.data.text || "-"}</span>
                        </div>
                      </>
                    )}
                    {!healthData.ok && healthData.data?.error && (
                      <div className="mt-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">
                        Erro: {healthData.data.error}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    {loading ? "Carregando..." : "Nenhum dado de saúde carregado."}
                  </p>
                )}
              </div>

              {/* Formulário de Configuração */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="mb-4 text-lg font-semibold">Configuração da API</h3>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Base URL</label>
                    <input
                      type="text"
                      value={config.baseUrl}
                      onChange={(e) => handleInputChange("baseUrl", e.target.value)}
                      placeholder="http://localhost:8080"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">API Key</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={config.apiKey}
                        onChange={(e) => handleInputChange("apiKey", e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        {showApiKey ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">
                      Nome da Instância Padrão
                    </label>
                    <input
                      type="text"
                      value={config.instanceName}
                      onChange={(e) => handleInputChange("instanceName", e.target.value)}
                      placeholder="Ex: whatsapp-principal"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500/40"
                    />
                    <p className="mt-1 px-1 text-xs text-zinc-500">
                      Instância usada para envio de mensagens simples (ex: teste).
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Webhook URL</label>
                    <input
                      type="text"
                      value={config.webhookUrl}
                      onChange={(e) => handleInputChange("webhookUrl", e.target.value)}
                      placeholder="http://localhost:8010/webhook/evolution"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500/40"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="mt-6 w-full rounded-2xl bg-cyan-600 px-4 py-3 font-medium transition hover:bg-cyan-500 disabled:opacity-60"
                >
                  {loading ? "Salvando..." : "Salvar Configuração"}
                </button>

                {statusMessage && (
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                    {statusMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "instances" && (
            <div className="space-y-4">
              {/* Aqui integramos o componente de instâncias existente */}
              <InstancesPage />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}