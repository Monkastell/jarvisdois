import { useEffect, useMemo, useState } from "react";
import {
  createAgent,
  getAgentBuilderSchema,
  listAgents,
  setAgentStatus,
  updateAgent,
} from "../../services/agents";

const statusTone = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  inactive: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  disabled: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const emptyForm = {
  id: "",
  name: "",
  type: "generic",
  description: "",
  status: "active",
  llm_enabled: false,
  allowed_tools: [],
  listening: {
    whatsapp: false,
    sms: false,
  },
  handoff_rules: [],
  metadata: {
    version: 1,
    created_by: "user",
  },
};

function SectionCard({ title, children, subtitle }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-300">
          {title}
        </h3>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TextInput({ label, value, onChange, placeholder = "", disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none transition focus:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none transition focus:border-zinc-600"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none transition focus:border-zinc-600"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SwitchInput({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition ${
        checked
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-zinc-800 bg-zinc-950 text-zinc-400"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
          checked ? "bg-emerald-500/20" : "bg-zinc-800"
        }`}
      >
        {checked ? "Ligado" : "Desligado"}
      </span>
    </button>
  );
}

function ToolsSelector({ tools = [], selected = [], onChange }) {
  function toggle(toolKey) {
    const exists = selected.includes(toolKey);
    onChange(exists ? selected.filter((item) => item !== toolKey) : [...selected, toolKey]);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {tools.map((tool) => {
        const active = selected.includes(tool.key);
        const available = tool.available !== false;

        return (
          <button
            key={tool.key}
            type="button"
            disabled={!available}
            onClick={() => toggle(tool.key)}
            className={`rounded-2xl border p-4 text-left transition ${
              active
                ? "border-indigo-500/50 bg-indigo-500/10"
                : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
            } ${!available ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-zinc-100">{tool.label}</strong>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  active ? "bg-indigo-400/20 text-indigo-200" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {active ? "Ativa" : "Off"}
              </span>
            </div>

            <p className="mt-2 text-sm text-zinc-400">{tool.description}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {(tool.requires || []).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function HandoffRulesBuilder({
  rules = [],
  conditions = [],
  agentOptions = [],
  onChange,
}) {
  function addRule() {
    onChange([...rules, { condition: "", target_agent: "" }]);
  }

  function updateRule(index, field, value) {
    const next = [...rules];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function removeRule(index) {
    onChange(rules.filter((_, idx) => idx !== index));
  }

  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-500">
          Nenhuma regra de handoff criada ainda.
        </div>
      ) : null}

      {rules.map((rule, index) => (
        <div
          key={`${rule.condition}-${rule.target_agent}-${index}`}
          className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <select
            value={rule.condition || ""}
            onChange={(e) => updateRule(index, "condition", e.target.value)}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none"
          >
            <option value="">Selecione a condição</option>
            {conditions.map((condition) => (
              <option key={condition.key} value={condition.key}>
                {condition.label}
              </option>
            ))}
          </select>

          <select
            value={rule.target_agent || ""}
            onChange={(e) => updateRule(index, "target_agent", e.target.value)}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none"
          >
            <option value="">Selecione o agente destino</option>
            {agentOptions.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => removeRule(index)}
            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            Remover
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRule}
        className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-600"
      >
        Adicionar regra
      </button>
    </div>
  );
}

function AgentCard({ agent, onEdit, onToggleStatus }) {
  const tone = statusTone[agent.status] || statusTone.inactive;

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-zinc-100">{agent.name}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${tone}`}>
              {agent.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {agent.id} · {agent.type}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onEdit(agent)}
          className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 transition hover:border-zinc-600"
        >
          Editar
        </button>
      </div>

      <p className="mt-4 min-h-[48px] text-sm text-zinc-400">
        {agent.description || "Sem descrição. Um agente silencioso, observando do escuro."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(agent.allowed_tools || []).map((tool) => (
          <span
            key={tool}
            className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300"
          >
            {tool}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
          Escuta WhatsApp:{" "}
          <strong>{agent?.listening?.whatsapp ? "Sim" : "Não"}</strong>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
          Escuta SMS: <strong>{agent?.listening?.sms ? "Sim" : "Não"}</strong>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {agent.status !== "active" ? (
          <button
            type="button"
            onClick={() => onToggleStatus(agent.id, "active")}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200"
          >
            Ativar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onToggleStatus(agent.id, "inactive")}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200"
          >
            Inativar
          </button>
        )}

        <button
          type="button"
          onClick={() => onToggleStatus(agent.id, "disabled")}
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200"
        >
          Desativar
        </button>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [schema, setSchema] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const availableTools = useMemo(() => schema?.options?.tools || [], [schema]);
  const agentTypeOptions = useMemo(() => schema?.options?.agent_types || [], [schema]);
  const statusOptions = useMemo(() => schema?.options?.statuses || [], [schema]);
  const handoffConditions = useMemo(() => schema?.options?.handoff_conditions || [], [schema]);

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const [schemaResponse, agentsResponse] = await Promise.all([
        getAgentBuilderSchema(),
        listAgents(true),
      ]);

      setSchema(schemaResponse);
      setAgents(agentsResponse.items || []);
      setForm(schemaResponse.defaults || emptyForm);
    } catch (err) {
      setError(err.message || "Erro ao carregar central de agentes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  function patchForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function patchListening(key, value) {
    setForm((prev) => ({
      ...prev,
      listening: {
        ...(prev.listening || {}),
        [key]: value,
      },
    }));
  }

  function patchMetadata(key, value) {
    setForm((prev) => ({
      ...prev,
      metadata: {
        ...(prev.metadata || {}),
        [key]: value,
      },
    }));
  }

  function resetForm() {
    setEditingId(null);
    setFeedback("");
    setError("");
    setForm(schema?.defaults || emptyForm);
  }

  function handleEdit(agent) {
    setEditingId(agent.id);
    setFeedback("");
    setError("");
    setForm({
      ...emptyForm,
      ...agent,
      listening: {
        whatsapp: !!agent?.listening?.whatsapp,
        sms: !!agent?.listening?.sms,
      },
      metadata: {
        version: agent?.metadata?.version ?? 1,
        created_by: agent?.metadata?.created_by ?? "user",
      },
      handoff_rules: Array.isArray(agent?.handoff_rules) ? agent.handoff_rules : [],
      allowed_tools: Array.isArray(agent?.allowed_tools) ? agent.allowed_tools : [],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");

    const payload = {
      ...form,
      id: String(form.id || "").trim(),
      name: String(form.name || "").trim(),
      description: String(form.description || "").trim(),
    };

    if (!payload.id || !payload.name) {
      setSaving(false);
      setError("ID e nome do agente são obrigatórios.");
      return;
    }

    try {
      if (editingId) {
        await updateAgent(editingId, payload);
        setFeedback("Agente atualizado com sucesso.");
      } else {
        await createAgent(payload);
        setFeedback("Agente criado com sucesso.");
      }

      const refreshed = await listAgents(true);
      setAgents(refreshed.items || []);
      resetForm();
    } catch (err) {
      setError(err.message || "Não foi possível salvar o agente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(agentId, status) {
    setError("");
    setFeedback("");

    try {
      await setAgentStatus(agentId, status);
      const refreshed = await listAgents(true);
      setAgents(refreshed.items || []);
      setFeedback(`Status do agente "${agentId}" alterado para ${status}.`);
    } catch (err) {
      setError(err.message || "Não foi possível alterar o status.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
        <div className="mx-auto max-w-7xl animate-pulse space-y-4">
          <div className="h-10 w-72 rounded-2xl bg-zinc-900" />
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="h-[720px] rounded-3xl bg-zinc-900" />
            <div className="h-[720px] rounded-3xl bg-zinc-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Central de Agentes
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
              Orquestração de agentes do Jarvis
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Configure agentes executores, ferramentas autorizadas, canais escutados
              e regras de handoff. Jarvis continua sendo o maestro; aqui você só escala
              os cavaleiros.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-600"
          >
            Novo agente
          </button>
        </div>

        {(feedback || error) && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {error || feedback}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <form onSubmit={handleSave} className="space-y-6">
            <SectionCard
              title={editingId ? "Editar agente" : "Criar agente"}
              subtitle="A tela obedece o schema do backend. Sem feitiçaria improvisada."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="ID do agente"
                  value={form.id}
                  onChange={(value) => patchForm({ id: value })}
                  placeholder="ex: receptivo"
                  disabled={!!editingId}
                />
                <TextInput
                  label="Nome"
                  value={form.name}
                  onChange={(value) => patchForm({ name: value })}
                  placeholder="ex: Agente Receptivo"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SelectInput
                  label="Tipo"
                  value={form.type}
                  onChange={(value) => patchForm({ type: value })}
                  options={agentTypeOptions}
                />
                <SelectInput
                  label="Status"
                  value={form.status}
                  onChange={(value) => patchForm({ status: value })}
                  options={statusOptions}
                />
              </div>

              <div className="mt-4">
                <TextArea
                  label="Descrição"
                  value={form.description}
                  onChange={(value) => patchForm({ description: value })}
                  placeholder="Descreva o papel do agente no ecossistema do Jarvis."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Comportamento e canais"
              subtitle="Defina o temperamento operacional do agente."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <SwitchInput
                  label="LLM habilitada"
                  checked={!!form.llm_enabled}
                  onChange={(value) => patchForm({ llm_enabled: value })}
                />
                <SwitchInput
                  label="Escuta WhatsApp"
                  checked={!!form?.listening?.whatsapp}
                  onChange={(value) => patchListening("whatsapp", value)}
                />
                <SwitchInput
                  label="Escuta SMS"
                  checked={!!form?.listening?.sms}
                  onChange={(value) => patchListening("sms", value)}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Ferramentas autorizadas"
              subtitle="Cada tool habilitada amplia o alcance do agente. Use com juízo, não com pólvora."
            >
              <ToolsSelector
                tools={availableTools}
                selected={form.allowed_tools || []}
                onChange={(value) => patchForm({ allowed_tools: value })}
              />
            </SectionCard>

            <SectionCard
              title="Regras de handoff"
              subtitle="Quando uma condição ocorrer, o agente pode passar o bastão para outro."
            >
              <HandoffRulesBuilder
                rules={form.handoff_rules || []}
                conditions={handoffConditions}
                agentOptions={agents.filter((agent) => agent.id !== form.id)}
                onChange={(value) => patchForm({ handoff_rules: value })}
              />
            </SectionCard>

            <SectionCard
              title="Metadados"
              subtitle="Camada simples para rastreabilidade e versionamento."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Versão"
                  value={form?.metadata?.version ?? 1}
                  onChange={(value) => patchMetadata("version", Number(value || 1))}
                  placeholder="1"
                />
                <TextInput
                  label="Criado por"
                  value={form?.metadata?.created_by ?? "user"}
                  onChange={(value) => patchMetadata("created_by", value)}
                  placeholder="user"
                />
              </div>
            </SectionCard>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar agente"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-600"
              >
                Limpar formulário
              </button>
            </div>
          </form>

          <div className="space-y-6">
            <SectionCard
              title="Agentes cadastrados"
              subtitle={`${agents.length} agente(s) carregado(s) do registry.`}
            >
              <div className="space-y-4">
                {agents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5 text-sm text-zinc-500">
                    Nenhum agente cadastrado ainda.
                  </div>
                ) : (
                  agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onEdit={handleEdit}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Leitura rápida do sistema"
              subtitle="Resumo operacional para não perder o fio da espada."
            >
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  Jarvis decide o fluxo.
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  Agentes executam ferramentas autorizadas.
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  Handoff move o controle entre agentes sem acoplamento tosco.
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  Chatbot entra depois como habilidade, não como reino independente.
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}