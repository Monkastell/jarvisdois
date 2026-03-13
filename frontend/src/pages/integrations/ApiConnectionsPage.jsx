import { useEffect, useMemo, useState } from "react";
import { jarvisBus } from "../../core/jarvis/eventBus";
import {
  createApiConnection,
  deleteApiConnection,
  listApiConnections,
  markApiConnectionError,
  markApiConnectionSuccess,
  markApiConnectionTesting,
  toggleApiConnection,
  updateApiConnection,
} from "../../services/firebase/apiConnections";
import { testApiConnection } from "../../services/runtime/apiConnectionRuntime";

const PROGRAM_OPTIONS = [
  { value: "evolution", label: "Evolution API" },
  { value: "airmore", label: "AirMore" },
  { value: "gemini", label: "Gemini" },
  { value: "custom", label: "Outro" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "test", label: "Teste" },
  { value: "production", label: "Produção" },
];

const AUTH_OPTIONS = [
  { value: "none", label: "Nenhuma" },
  { value: "bearer", label: "Bearer Token" },
  { value: "apikey", label: "API Key" },
  { value: "custom_header", label: "Header customizado" },
];

const EVENT_OPTIONS = [
  "messages.upsert",
  "MESSAGES_UPSERT",
  "connection.update",
  "qrcode.updated",
  "send.message",
  "messages.update",
  "instance.created",
  "instance.deleted",
];

const DEFAULT_FORM = {
  name: "",
  program: "evolution",
  description: "",
  environment: "local",
  isActive: true,
  connectionType: ["api", "webhook"],

  apiConfig: {
    baseUrl: "",
    authType: "apikey",
    apiKey: "",
    defaultHeaders: "",
    testRoute: "",
    timeoutMs: 10000,
  },

  webhookConfig: {
    enabled: true,
    internalEndpoint: "/webhook/evolution",
    externalWebhookUrl: "",
    events: ["messages.upsert"],
    secret: "",
    validateOrigin: false,
  },

  operationalScript: {
    objective: "",
    expectedFlow: "",
    technicalNotes: "",
  },

  status: {
    state: "configured",
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: "",
    lastHttpStatus: null,
    lastLatencyMs: null,
  },
};

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) return "Nunca";

  try {
    if (value?.seconds) {
      return new Date(value.seconds * 1000).toLocaleString("pt-BR");
    }
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return "Nunca";
  }
}

function getStatusMeta(connection) {
  if (!connection.isActive) {
    return {
      label: "Desligada",
      dot: "bg-zinc-500",
      badge: "bg-zinc-500/15 text-zinc-300 border-zinc-700",
    };
  }

  const state = connection?.status?.state || "configured";

  if (state === "active") {
    return {
      label: "Ativa",
      dot: "bg-emerald-500",
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    };
  }

  if (state === "error") {
    return {
      label: "Erro",
      dot: "bg-red-500",
      badge: "bg-red-500/15 text-red-300 border-red-500/20",
    };
  }

  if (state === "testing") {
    return {
      label: "Testando",
      dot: "bg-amber-400",
      badge: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    };
  }

  return {
    label: "Configurada",
    dot: "bg-cyan-400",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  };
}

function SectionTitle({ title, description }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs text-zinc-400">{description}</p>
      ) : null}
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder = "", rows = 4 }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-left"
    >
      <div>
        <div className="text-sm text-white">{label}</div>
        {description ? (
          <div className="mt-1 text-xs text-zinc-500">{description}</div>
        ) : null}
      </div>

      <span
        className={classNames(
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          checked ? "bg-cyan-500" : "bg-zinc-700"
        )}
      >
        <span
          className={classNames(
            "inline-block h-5 w-5 transform rounded-full bg-white transition",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </span>
    </button>
  );
}

function CheckboxChip({ checked, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-full border px-3 py-1.5 text-xs transition",
        checked
          ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900"
      )}
    >
      {label}
    </button>
  );
}

function ConnectionModal({
  open,
  mode,
  initialData,
  onClose,
  onSave,
  saving,
}) {
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setTab("general");
    setError("");

    if (initialData) {
      setForm({
        ...DEFAULT_FORM,
        ...initialData,
        apiConfig: {
          ...DEFAULT_FORM.apiConfig,
          ...(initialData.apiConfig || {}),
        },
        webhookConfig: {
          ...DEFAULT_FORM.webhookConfig,
          ...(initialData.webhookConfig || {}),
        },
        operationalScript: {
          ...DEFAULT_FORM.operationalScript,
          ...(initialData.operationalScript || {}),
        },
        status: {
          ...DEFAULT_FORM.status,
          ...(initialData.status || {}),
        },
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [open, initialData]);

  if (!open) return null;

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateNested(section, field, value) {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }

  function toggleConnectionType(type) {
    setForm((prev) => {
      const exists = prev.connectionType.includes(type);
      return {
        ...prev,
        connectionType: exists
          ? prev.connectionType.filter((item) => item !== type)
          : [...prev.connectionType, type],
      };
    });
  }

  function toggleWebhookEvent(eventName) {
    setForm((prev) => {
      const exists = prev.webhookConfig.events.includes(eventName);
      return {
        ...prev,
        webhookConfig: {
          ...prev.webhookConfig,
          events: exists
            ? prev.webhookConfig.events.filter((item) => item !== eventName)
            : [...prev.webhookConfig.events, eventName],
        },
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Informe o nome da conexão.");
      setTab("general");
      return;
    }

    if (form.connectionType.length === 0) {
      setError("Selecione pelo menos um tipo de conexão.");
      setTab("general");
      return;
    }

    if (form.connectionType.includes("api") && !form.apiConfig.baseUrl.trim()) {
      setError("Informe a Base URL da API.");
      setTab("api");
      return;
    }

    await onSave(form);
  }

  const tabs = [
    { id: "general", label: "Geral" },
    { id: "api", label: "API" },
    { id: "webhook", label: "Webhook" },
    { id: "script", label: "Roteiro" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {mode === "edit" ? "Editar conexão" : "Nova conexão"}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Cadastre integrações por programa com API, webhook e roteiro operacional.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Fechar
          </button>
        </div>

        <div className="border-b border-zinc-800 px-6 pt-4">
          <div className="flex flex-wrap gap-2 pb-4">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={classNames(
                  "rounded-full px-4 py-2 text-sm transition",
                  tab === item.id
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {tab === "general" && (
            <div className="space-y-6">
              <SectionTitle
                title="Informações gerais"
                description="Defina o programa, tipo de integração e ambiente operacional."
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Nome da conexão"
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                  placeholder="Evolution Principal"
                />

                <Select
                  label="Programa"
                  value={form.program}
                  onChange={(value) => updateField("program", value)}
                  options={PROGRAM_OPTIONS}
                />

                <Input
                  label="Descrição curta"
                  value={form.description}
                  onChange={(value) => updateField("description", value)}
                  placeholder="Integração principal do WhatsApp receptivo"
                />

                <Select
                  label="Ambiente"
                  value={form.environment}
                  onChange={(value) => updateField("environment", value)}
                  options={ENVIRONMENT_OPTIONS}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <span className="mb-2 block text-xs text-zinc-400">
                    Tipo de conexão
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <CheckboxChip
                      checked={form.connectionType.includes("api")}
                      onClick={() => toggleConnectionType("api")}
                      label="API"
                    />
                    <CheckboxChip
                      checked={form.connectionType.includes("webhook")}
                      onClick={() => toggleConnectionType("webhook")}
                      label="Webhook"
                    />
                  </div>
                </div>

                <Toggle
                  checked={form.isActive}
                  onChange={(checked) => updateField("isActive", checked)}
                  label="Conexão ativa"
                  description="Define se a integração começa ligada ao salvar."
                />
              </div>
            </div>
          )}

          {tab === "api" && (
            <div className="space-y-6">
              <SectionTitle
                title="Configuração da API"
                description="Defina a Base URL, autenticação e rota usada para teste."
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Base URL"
                  value={form.apiConfig.baseUrl}
                  onChange={(value) => updateNested("apiConfig", "baseUrl", value)}
                  placeholder="http://127.0.0.1:8080"
                />

                <Select
                  label="Tipo de autenticação"
                  value={form.apiConfig.authType}
                  onChange={(value) => updateNested("apiConfig", "authType", value)}
                  options={AUTH_OPTIONS}
                />

                <Input
                  label="API Key / Token"
                  value={form.apiConfig.apiKey}
                  onChange={(value) => updateNested("apiConfig", "apiKey", value)}
                  placeholder="minhachave123456"
                />

                <Input
                  label="Rota de teste"
                  value={form.apiConfig.testRoute}
                  onChange={(value) => updateNested("apiConfig", "testRoute", value)}
                  placeholder="/manager/instance/fetchInstances"
                />

                <Input
                  label="Timeout (ms)"
                  type="number"
                  value={form.apiConfig.timeoutMs}
                  onChange={(value) => updateNested("apiConfig", "timeoutMs", value)}
                  placeholder="10000"
                />

                <Input
                  label="Headers extras"
                  value={form.apiConfig.defaultHeaders}
                  onChange={(value) => updateNested("apiConfig", "defaultHeaders", value)}
                  placeholder='{"x-source":"jarvis"}'
                />
              </div>
            </div>
          )}

          {tab === "webhook" && (
            <div className="space-y-6">
              <SectionTitle
                title="Configuração do webhook"
                description="Defina o endpoint do Jarvis e os eventos que o programa poderá enviar."
              />

              <Toggle
                checked={form.webhookConfig.enabled}
                onChange={(checked) => updateNested("webhookConfig", "enabled", checked)}
                label="Webhook habilitado"
                description="Permite que a integração use recebimento de eventos."
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Endpoint interno"
                  value={form.webhookConfig.internalEndpoint}
                  onChange={(value) => updateNested("webhookConfig", "internalEndpoint", value)}
                  placeholder="/webhook/evolution"
                />

                <Input
                  label="Webhook externo"
                  value={form.webhookConfig.externalWebhookUrl}
                  onChange={(value) => updateNested("webhookConfig", "externalWebhookUrl", value)}
                  placeholder="https://seudominio.com/webhook/evolution"
                />

                <Input
                  label="Segredo / assinatura"
                  value={form.webhookConfig.secret}
                  onChange={(value) => updateNested("webhookConfig", "secret", value)}
                  placeholder="opcional"
                />
              </div>

              <Toggle
                checked={form.webhookConfig.validateOrigin}
                onChange={(checked) => updateNested("webhookConfig", "validateOrigin", checked)}
                label="Validar origem do webhook"
                description="Use quando a integração exigir assinatura ou verificação de origem."
              />

              <div>
                <span className="mb-2 block text-xs text-zinc-400">
                  Eventos escutados
                </span>
                <div className="flex flex-wrap gap-2">
                  {EVENT_OPTIONS.map((eventName) => (
                    <CheckboxChip
                      key={eventName}
                      checked={form.webhookConfig.events.includes(eventName)}
                      onClick={() => toggleWebhookEvent(eventName)}
                      label={eventName}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "script" && (
            <div className="space-y-6">
              <SectionTitle
                title="Roteiro operacional"
                description="Documente para que serve a integração e qual fluxo o Jarvis deve observar."
              />

              <TextArea
                label="Objetivo da integração"
                value={form.operationalScript.objective}
                onChange={(value) => updateNested("operationalScript", "objective", value)}
                placeholder="Receber mensagens da Evolution e passar todos os eventos antes pelo Jarvis."
                rows={4}
              />

              <TextArea
                label="Fluxo esperado"
                value={form.operationalScript.expectedFlow}
                onChange={(value) => updateNested("operationalScript", "expectedFlow", value)}
                placeholder="Evolution -> Webhook -> Jarvis -> Logs operacionais -> roteamento por agente"
                rows={4}
              />

              <TextArea
                label="Observações técnicas"
                value={form.operationalScript.technicalNotes}
                onChange={(value) => updateNested("operationalScript", "technicalNotes", value)}
                placeholder="Instância principal: ConsigCred-Receptivo. Eventos mais importantes: messages.upsert e connection.update."
                rows={5}
              />
            </div>
          )}
        </form>

        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
          <p className="text-xs text-zinc-500">
            O Jarvis vai usar esse cadastro como mapa de integração.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {saving ? "Salvando..." : mode === "edit" ? "Salvar alterações" : "Criar conexão"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : tone === "danger"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : tone === "warning"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-zinc-800 bg-zinc-900 text-white";

  return (
    <div className={classNames("rounded-2xl border p-4", toneClass)}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ConnectionCard({ item, onEdit, onToggle, onDelete, onTest, testingId }) {
  const status = getStatusMeta(item);
  const isTesting = testingId === item.id;

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {item.name || "Sem nome"}
            </h3>

            <span
              className={classNames(
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]",
                status.badge
              )}
            >
              <span className={classNames("h-2 w-2 rounded-full", status.dot)} />
              {status.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
            <span className="rounded-full bg-zinc-950 px-2.5 py-1">
              {PROGRAM_OPTIONS.find((p) => p.value === item.program)?.label || item.program}
            </span>
            <span className="rounded-full bg-zinc-950 px-2.5 py-1">
              {item.environment || "local"}
            </span>
            {(item.connectionType || []).map((type) => (
              <span key={type} className="rounded-full bg-zinc-950 px-2.5 py-1">
                {type}
              </span>
            ))}
          </div>

          {item.description ? (
            <p className="mt-3 text-sm text-zinc-400">{item.description}</p>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                Base URL
              </div>
              <div className="mt-2 break-all text-sm text-white">
                {item.apiConfig?.baseUrl || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                Endpoint interno
              </div>
              <div className="mt-2 break-all text-sm text-white">
                {item.webhookConfig?.internalEndpoint || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                Última verificação
              </div>
              <div className="mt-2 text-sm text-white">
                {formatDate(item.status?.lastCheckedAt)}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                Latência / HTTP
              </div>
              <div className="mt-2 text-sm text-white">
                {item.status?.lastLatencyMs ?? "—"} ms / {item.status?.lastHttpStatus ?? "—"}
              </div>
            </div>
          </div>

          {item.status?.lastErrorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-500/10 bg-red-500/5 p-3">
              <div className="text-[11px] uppercase tracking-wide text-red-300/80">
                Último erro
              </div>
              <div className="mt-2 text-sm text-zinc-200">
                {item.status.lastErrorMessage}
              </div>
            </div>
          ) : null}

          {item.operationalScript?.objective ? (
            <div className="mt-4 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-3">
              <div className="text-[11px] uppercase tracking-wide text-cyan-300/80">
                Objetivo
              </div>
              <div className="mt-2 text-sm text-zinc-200">
                {item.operationalScript.objective}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:w-[220px] lg:flex-col">
          <button
            onClick={() => onEdit(item)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Editar
          </button>

          <button
            onClick={() => onTest(item)}
            disabled={isTesting || !item.isActive}
            className="rounded-xl bg-cyan-500/15 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {isTesting ? "Testando..." : "Testar"}
          </button>

          <button
            onClick={() => onToggle(item)}
            className={classNames(
              "rounded-xl px-4 py-2 text-sm transition",
              item.isActive
                ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/20"
                : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
            )}
          >
            {item.isActive ? "Desligar" : "Ligar"}
          </button>

          <button
            onClick={() => onDelete(item)}
            className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApiConnectionsPage() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);

  const [filterProgram, setFilterProgram] = useState("all");
  const [filterState, setFilterState] = useState("all");

  async function loadConnections() {
    setLoading(true);

    try {
      const items = await listApiConnections();
      setConnections(items);

      jarvisBus.emit(
        "api_connections_loaded",
        { total: items.length },
        { source: "firebase", module: "ApiConnectionsPage" }
      );
    } catch (error) {
      console.error("Erro ao carregar conexões:", error);

      jarvisBus.emit(
        "api_connections_load_failed",
        { error: error.message },
        { source: "firebase", module: "ApiConnectionsPage" }
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
  }, []);

  const filteredConnections = useMemo(() => {
    return connections.filter((item) => {
      const programOk =
        filterProgram === "all" ? true : item.program === filterProgram;

      const stateOk =
        filterState === "all"
          ? true
          : filterState === "active"
          ? item.isActive === true
          : filterState === "disabled"
          ? item.isActive === false
          : (item.status?.state || "configured") === filterState;

      return programOk && stateOk;
    });
  }, [connections, filterProgram, filterState]);

  const summary = useMemo(() => {
    const active = connections.filter((item) => item.isActive).length;
    const errors = connections.filter((item) => item.status?.state === "error").length;
    const webhooks = connections.filter((item) => item.webhookConfig?.enabled).length;
    const total = connections.length;

    return { total, active, errors, webhooks };
  }, [connections]);

  async function handleSave(formData) {
    setSaving(true);

    try {
      if (editingConnection?.id) {
        await updateApiConnection(editingConnection.id, { ...formData });

        jarvisBus.emit(
          "api_connection_updated",
          {
            connectionId: editingConnection.id,
            name: formData.name,
            program: formData.program,
          },
          { source: "firebase", module: "ApiConnectionsPage" }
        );
      } else {
        const created = await createApiConnection(formData);

        jarvisBus.emit(
          "api_connection_created",
          {
            connectionId: created.id,
            name: formData.name,
            program: formData.program,
          },
          { source: "firebase", module: "ApiConnectionsPage" }
        );
      }

      setModalOpen(false);
      setEditingConnection(null);
      await loadConnections();
    } catch (error) {
      console.error(error);
      alert(error.message || "Erro ao salvar conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item) {
    const nextState = !item.isActive;

    try {
      await toggleApiConnection(item.id, nextState);

      jarvisBus.emit(
        nextState ? "api_connection_enabled" : "api_connection_disabled",
        {
          connectionId: item.id,
          name: item.name,
          program: item.program,
        },
        { source: "firebase", module: "ApiConnectionsPage" }
      );

      await loadConnections();
    } catch (error) {
      console.error(error);
      alert(error.message || "Erro ao alterar status da conexão.");
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Excluir a conexão "${item.name}"?`);
    if (!confirmed) return;

    try {
      await deleteApiConnection(item.id);

      jarvisBus.emit(
        "api_connection_deleted",
        {
          connectionId: item.id,
          name: item.name,
          program: item.program,
        },
        { source: "firebase", module: "ApiConnectionsPage" }
      );

      await loadConnections();
    } catch (error) {
      console.error(error);
      alert(error.message || "Erro ao excluir conexão.");
    }
  }

  async function handleTest(item) {
    setTestingId(item.id);

    try {
      await markApiConnectionTesting(item.id);

      jarvisBus.emit(
        "api_connection_test_started",
        {
          connectionId: item.id,
          name: item.name,
          program: item.program,
        },
        { source: "runtime", module: "ApiConnectionsPage" }
      );

      const result = await testApiConnection(item);

      if (result.ok) {
        await markApiConnectionSuccess(item.id, {
          httpStatus: result.httpStatus,
          latencyMs: result.latencyMs,
        });

        jarvisBus.emit(
          "api_connection_test_succeeded",
          {
            connectionId: item.id,
            name: item.name,
            program: item.program,
            httpStatus: result.httpStatus,
            latencyMs: result.latencyMs,
          },
          { source: "runtime", module: "ApiConnectionsPage" }
        );
      } else {
        await markApiConnectionError(item.id, {
          errorMessage: result.error || "Falha no teste",
          httpStatus: result.httpStatus,
          latencyMs: result.latencyMs,
        });

        jarvisBus.emit(
          "api_connection_test_failed",
          {
            connectionId: item.id,
            name: item.name,
            program: item.program,
            error: result.error || "Falha no teste",
          },
          { source: "runtime", module: "ApiConnectionsPage" }
        );
      }

      await loadConnections();
    } catch (error) {
      console.error(error);

      await markApiConnectionError(item.id, {
        errorMessage: error.message || "Erro ao testar conexão",
      });

      jarvisBus.emit(
        "api_connection_test_failed",
        {
          connectionId: item.id,
          name: item.name,
          program: item.program,
          error: error.message || "Erro ao testar conexão",
        },
        { source: "runtime", module: "ApiConnectionsPage" }
      );

      await loadConnections();
      alert(error.message || "Erro ao testar conexão.");
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Conexões API</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Gerencie integrações por programa, com API, webhook e roteiro operacional.
              Essa página vira o mapa oficial da infraestrutura do Jarvis.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingConnection(null);
              setModalOpen(true);
            }}
            className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-cyan-400"
          >
            Nova conexão
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <SummaryCard label="Total de conexões" value={summary.total} />
        <SummaryCard label="Ativas" value={summary.active} tone="success" />
        <SummaryCard label="Com erro" value={summary.errors} tone="danger" />
        <SummaryCard label="Webhooks habilitados" value={summary.webhooks} tone="warning" />
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Filtros operacionais</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Separe por programa e estado para não virar mercado persa com cabo solto.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">Todos os programas</option>
              {PROGRAM_OPTIONS.map((program) => (
                <option key={program.value} value={program.value}>
                  {program.label}
                </option>
              ))}
            </select>

            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">Todos os estados</option>
              <option value="active">Ativas</option>
              <option value="disabled">Desligadas</option>
              <option value="configured">Configuradas</option>
              <option value="error">Erro</option>
              <option value="testing">Testando</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400">
            Carregando conexões...
          </div>
        ) : filteredConnections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900 p-10 text-center">
            <div className="text-base font-medium text-white">
              Nenhuma conexão encontrada
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Cadastre sua primeira integração para o Jarvis começar a enxergar o mapa do reino.
            </p>
          </div>
        ) : (
          filteredConnections.map((item) => (
            <ConnectionCard
              key={item.id}
              item={item}
              onEdit={(connection) => {
                setEditingConnection(connection);
                setModalOpen(true);
              }}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onTest={handleTest}
              testingId={testingId}
            />
          ))
        )}
      </div>

      <ConnectionModal
        open={modalOpen}
        mode={editingConnection ? "edit" : "create"}
        initialData={editingConnection}
        onClose={() => {
          setModalOpen(false);
          setEditingConnection(null);
        }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}