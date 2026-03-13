import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { listAgents } from "../../services/agents";
import {
  getEvolutionInstances,
} from "../../services/evolution";
import {
  createWhatsAppDisparo,
  deleteWhatsAppDisparo,
  listWhatsAppDisparos,
  pauseWhatsAppDisparo,
  resumeWhatsAppDisparo,
  startWhatsAppDisparo,
} from "../../services/prospeccao";
import {
  buildLeadQueueItems,
  connectAirMore,
  createAirMoreTemplate,
  createListObject,
  deleteAirMoreTemplate,
  disconnectAirMore,
  dispatchJarvisAirMoreEvent,
  exportListsToXlsxRows,
  formatDateTimeLocal,
  getAirMoreHistory,
  getAirMoreReports,
  getAirMoreStatus,
  listAirMoreTemplates,
  loadAirMoreLists,
  normalizePhonesFromText,
  reorderQueue,
  saveAirMoreLists,
  sendAirMoreBatch,
  sortListsByPriorityAndSchedule,
  updateAirMoreTemplate,
} from "../../features/airmore/airmoreService";

const tabs = [
  { id: "whatsapp", label: "WhatsApp", icon: "◉" },
  { id: "sms", label: "SMS", icon: "✉" },
];

const STORAGE_KEYS = {
  whatsappTemplates: "jarvis_whatsapp_templates_v1",
  whatsappBindings: "jarvis_agent_configs_v1",
  whatsappDraft: "jarvis_whatsapp_draft_v2",
};

const PRIORITY_OPTIONS = [
  { id: "alta", label: "Alta", color: "rose" },
  { id: "media", label: "Média", color: "amber" },
  { id: "baixa", label: "Baixa", color: "emerald" },
];

const TYPING_SPEED_OPTIONS = [
  { id: "lento", label: "Lento (120ms/char)", value: 120 },
  { id: "normal", label: "Normal (60ms/char)", value: 60 },
  { id: "rapido", label: "Rápido (30ms/char)", value: 30 },
  { id: "instantaneo", label: "Instantâneo (0ms)", value: 0 },
];

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePhone(value) {
  if (!value) return "";
  let numbers = String(value).replace(/[^\d]/g, "");

  if (numbers.length === 10 || numbers.length === 11) {
    numbers = "55" + numbers;
  }

  if (numbers.length === 12 && numbers.startsWith("55")) {
    return numbers;
  }

  if (numbers.length === 13 && numbers.startsWith("55")) {
    return numbers;
  }

  if (numbers.length < 12) return "";
  return numbers;
}

function parseContacts(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(";");

      if (parts.length === 1) {
        const telefone = normalizePhone(parts[0]);
        return {
          id: uid("contact"),
          nome: telefone,
          telefone,
          produto: "",
          matricula: "",
          variavel1: "",
          variavel2: "",
          status: "pending",
          enviado: false,
          respondido: false,
          instanciaUsada: null,
          tentativas: 0,
          erro: null,
        };
      }

      const [nome, telefone, produto, matricula, variavel1, variavel2] = parts;
      const telefoneNormalizado = normalizePhone(telefone);

      return {
        id: uid("contact"),
        nome: String(nome || telefoneNormalizado || "").trim(),
        telefone: telefoneNormalizado,
        produto: String(produto || "").trim(),
        matricula: String(matricula || "").trim(),
        variavel1: String(variavel1 || "").trim(),
        variavel2: String(variavel2 || "").trim(),
        status: "pending",
        enviado: false,
        respondido: false,
        instanciaUsada: null,
        tentativas: 0,
        erro: null,
      };
    })
    .filter((item) => item.telefone && item.telefone.length >= 12);
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
}

function SectionCard({ title, subtitle, children, actions = null }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function TabButton({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition ${
        active ? "bg-cyan-500/15 text-cyan-300" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

function Badge({ children, className = "" }) {
  return <span className={`rounded-full border px-3 py-1 text-xs ${className}`}>{children}</span>;
}

function StatusBadge({ status, children }) {
  const colors = {
    running: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    paused: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    completed: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    error: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    draft: "border-zinc-700 bg-zinc-800 text-zinc-300",
    pending: "border-zinc-700 bg-zinc-800 text-zinc-300",
  };
  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${colors[status] || colors.pending}`}>
      {children}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    alta: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    media: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    baixa: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
  return <Badge className={colors[priority] || colors.media}>{priority}</Badge>;
}

function InstanceCard({ instance, selected, onToggle, agentBinding, onBindAgent, agents }) {
  const connected = ["connected", "open", "online"].includes(
    String(instance?.status || "").toLowerCase()
  );

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        selected
          ? "border-cyan-500/30 bg-cyan-500/10"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-white">{instance.name}</h4>
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-rose-500"}`} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {instance.number ? `📱 ${instance.number}` : "Não conectado"}
          </p>
        </div>

        <button
          onClick={() => onToggle(instance.name)}
          type="button"
          className={`rounded-xl px-3 py-1.5 text-xs transition ${
            selected ? "bg-cyan-500/15 text-cyan-300" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          {selected ? "Selecionado" : "Selecionar"}
        </button>
      </div>

      <div className="mt-3">
        <select
          value={agentBinding?.agentId || ""}
          onChange={(e) => onBindAgent(instance.name, e.target.value)}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none"
        >
          <option value="">Vincular agente...</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.id})
            </option>
          ))}
        </select>
      </div>

      {agentBinding?.agentId ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Agente:</span>
          <span className="text-cyan-300">{agentBinding.agentId}</span>
        </div>
      ) : null}
    </div>
  );
}

function TemplateCard({ template, selected, onSelect, onEdit, onDelete }) {
  const charCount = template.conteudo?.length || 0;
  const charClass =
    charCount >= 160 ? "text-rose-400" : charCount >= 120 ? "text-amber-400" : "text-zinc-400";

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        selected ? "border-cyan-500/30 bg-cyan-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-white">{template.nome}</h4>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{template.conteudo}</p>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => onSelect(template.id)}
            type="button"
            className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/20"
          >
            Usar
          </button>
          <button
            onClick={() => onEdit(template)}
            type="button"
            className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(template.id)}
            type="button"
            className="rounded-lg bg-rose-500/15 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={charClass}>Caracteres: {charCount}</span>
        <span className="text-zinc-500">Usos: {template.usos || 0}</span>
      </div>
    </div>
  );
}

function WhatsAppTab() {
  const [activeTab, setActiveTab] = useState("config");
  const [disparoNome, setDisparoNome] = useState("");
  const [priority, setPriority] = useState("media");
  const [selectedInstances, setSelectedInstances] = useState([]);
  const [instanceBindings, setInstanceBindings] = useState({});
  const [typingSpeed, setTypingSpeed] = useState("normal");
  const [delayEntreMensagens, setDelayEntreMensagens] = useState(15);
  const [delayEntreInstancias, setDelayEntreInstancias] = useState(30);
  const [variarTemplates, setVariarTemplates] = useState(true);
  const [templatesRotativos, setTemplatesRotativos] = useState([]);
  const [contactsText, setContactsText] = useState("");
  const [contacts, setContacts] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [origemLista, setOrigemLista] = useState("manual");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateNome, setTemplateNome] = useState("");
  const [templateConteudo, setTemplateConteudo] = useState("");
  const [editTemplateId, setEditTemplateId] = useState(null);
  const [instances, setInstances] = useState([]);
  const [agents, setAgents] = useState([]);
  const [disparos, setDisparos] = useState([]);
  const [selectedDisparoId, setSelectedDisparoId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInstances, setLoadingInstances] = useState(false);

  const pollingRef = useRef(null);

  useEffect(() => {
    loadInitialData();

    pollingRef.current = setInterval(() => {
      listWhatsAppDisparos()
        .then((data) => setDisparos(data.items || []))
        .catch(() => {});
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.whatsappTemplates, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.whatsappBindings, JSON.stringify(instanceBindings));
  }, [instanceBindings]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.whatsappDraft,
      JSON.stringify({
        disparoNome,
        priority,
        selectedInstances,
        typingSpeed,
        delayEntreMensagens,
        delayEntreInstancias,
        variarTemplates,
        templatesRotativos,
        contactsText,
        contacts,
        selectedFileName,
        origemLista,
        selectedTemplateId,
        templateNome,
        templateConteudo,
      })
    );
  }, [
    disparoNome,
    priority,
    selectedInstances,
    typingSpeed,
    delayEntreMensagens,
    delayEntreInstancias,
    variarTemplates,
    templatesRotativos,
    contactsText,
    contacts,
    selectedFileName,
    origemLista,
    selectedTemplateId,
    templateNome,
    templateConteudo,
  ]);

  async function loadInitialData() {
    setLoading(true);
    try {
      setLoadingInstances(true);
      const [instancesData, agentsData, disparosData] = await Promise.all([
        getEvolutionInstances(),
        listAgents(true),
        listWhatsAppDisparos(),
      ]);

      setInstances(Array.isArray(instancesData) ? instancesData : []);
      setAgents(agentsData?.items || []);
      setDisparos(disparosData?.items || []);

      const savedTemplates = JSON.parse(localStorage.getItem(STORAGE_KEYS.whatsappTemplates) || "[]");
      const savedBindings = JSON.parse(localStorage.getItem(STORAGE_KEYS.whatsappBindings) || "{}");
      const savedDraft = JSON.parse(localStorage.getItem(STORAGE_KEYS.whatsappDraft) || "null");

      setTemplates(savedTemplates);
      setInstanceBindings(savedBindings);

      if (savedDraft) {
        setDisparoNome(savedDraft.disparoNome || "");
        setPriority(savedDraft.priority || "media");
        setSelectedInstances(savedDraft.selectedInstances || []);
        setTypingSpeed(savedDraft.typingSpeed || "normal");
        setDelayEntreMensagens(savedDraft.delayEntreMensagens ?? 15);
        setDelayEntreInstancias(savedDraft.delayEntreInstancias ?? 30);
        setVariarTemplates(savedDraft.variarTemplates ?? true);
        setTemplatesRotativos(savedDraft.templatesRotativos || []);
        setContactsText(savedDraft.contactsText || "");
        setContacts(savedDraft.contacts || []);
        setSelectedFileName(savedDraft.selectedFileName || "");
        setOrigemLista(savedDraft.origemLista || "manual");
        setSelectedTemplateId(savedDraft.selectedTemplateId || "");
        setTemplateNome(savedDraft.templateNome || "");
        setTemplateConteudo(savedDraft.templateConteudo || "");
      }
    } catch (error) {
      setStatusMessage(error.message || "Erro ao carregar dados do WhatsApp.");
    } finally {
      setLoading(false);
      setLoadingInstances(false);
    }
  }

  function handleToggleInstance(instanceName) {
    setSelectedInstances((prev) =>
      prev.includes(instanceName)
        ? prev.filter((name) => name !== instanceName)
        : [...prev, instanceName]
    );
  }

  function handleBindAgent(instanceName, agentId) {
    setInstanceBindings((prev) => ({
      ...prev,
      [instanceName]: {
        ...prev[instanceName],
        agentId,
        updatedAt: Date.now(),
      },
    }));
    setStatusMessage(`Instância ${instanceName} vinculada ao agente ${agentId || "nenhum"}.`);
  }

  function handleSaveTemplate() {
    if (!templateNome.trim() || !templateConteudo.trim()) {
      setStatusMessage("Nome e conteúdo são obrigatórios");
      return;
    }

    if (editTemplateId) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editTemplateId ? { ...t, nome: templateNome, conteudo: templateConteudo } : t))
      );
      setStatusMessage("Template atualizado!");
    } else {
      const newTemplate = {
        id: uid("tpl"),
        nome: templateNome,
        conteudo: templateConteudo,
        usos: 0,
        createdAt: Date.now(),
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      setStatusMessage("Template criado!");
    }

    setTemplateNome("");
    setTemplateConteudo("");
    setEditTemplateId(null);
  }

  function handleEditTemplate(template) {
    setEditTemplateId(template.id);
    setTemplateNome(template.nome);
    setTemplateConteudo(template.conteudo);
    setActiveTab("templates");
  }

  function handleDeleteTemplate(templateId) {
    if (!window.confirm("Excluir template permanentemente?")) return;

    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId("");
    }
  }

  function handleUseTemplate(templateId) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, usos: (t.usos || 0) + 1 } : t))
    );

    if (variarTemplates && !templatesRotativos.includes(templateId)) {
      setTemplatesRotativos((prev) => [...prev, templateId]);
    }

    setStatusMessage(`Template "${template.nome}" selecionado`);
  }

  function handleBuildContacts() {
    const parsed = parseContacts(contactsText);
    if (parsed.length === 0) {
      setStatusMessage("Nenhum contato válido encontrado");
      return;
    }
    setContacts(parsed);
    setStatusMessage(`${parsed.length} contato(s) carregado(s)`);
  }

  function handleImportExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const binary = e.target.result;
      const workbook = XLSX.read(binary, { type: "binary" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const textLines = rows
        .slice(1)
        .map((row) => row.join(";"))
        .join("\n");

      setContactsText(textLines);
      setOrigemLista("excel");

      const parsed = parseContacts(textLines);
      setContacts(parsed);
      setStatusMessage(`Excel importado: ${parsed.length} contatos`);
    };
    reader.readAsBinaryString(file);
  }

  async function handleCreateDisparo() {
    if (!disparoNome.trim()) {
      setStatusMessage("Nome do disparo é obrigatório");
      return;
    }

    if (selectedInstances.length === 0) {
      setStatusMessage("Selecione pelo menos uma instância");
      return;
    }

    if (!selectedTemplateId && templatesRotativos.length === 0) {
      setStatusMessage("Selecione um template ou configure templates rotativos");
      return;
    }

    if (contacts.length === 0) {
      setStatusMessage("Carregue uma lista de contatos");
      return;
    }

    const chosenTemplateId = templatesRotativos.length > 0 ? templatesRotativos[0] : selectedTemplateId;
    const chosenTemplate = templates.find((t) => t.id === chosenTemplateId);

    if (!chosenTemplate) {
      setStatusMessage("Template selecionado não encontrado");
      return;
    }

    setLoading(true);
    try {
      const created = await createWhatsAppDisparo({
        name: disparoNome,
        priority,
        instances: selectedInstances,
        instance_bindings: instanceBindings,
        selected_template_id: chosenTemplate.id,
        templates_rotativos: templatesRotativos,
        template: chosenTemplate.conteudo,
        typing_speed: TYPING_SPEED_OPTIONS.find((o) => o.id === typingSpeed)?.value || 60,
        delay_seconds: delayEntreMensagens,
        delay_between_instances: delayEntreInstancias,
        contacts_text: contactsText,
      });

      setStatusMessage(`Disparo "${created.item?.name || disparoNome}" criado com sucesso.`);
      const refreshed = await listWhatsAppDisparos();
      setDisparos(refreshed.items || []);
      setSelectedDisparoId(created.item?.id || null);
      setActiveTab("disparos");
    } catch (error) {
      setStatusMessage(error.message || "Erro ao criar disparo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisparoAction(action, disparoId) {
    try {
      if (action === "start") await startWhatsAppDisparo(disparoId);
      if (action === "pause") await pauseWhatsAppDisparo(disparoId);
      if (action === "resume") await resumeWhatsAppDisparo(disparoId);
      if (action === "delete") await deleteWhatsAppDisparo(disparoId);

      const refreshed = await listWhatsAppDisparos();
      setDisparos(refreshed.items || []);
    } catch (error) {
      setStatusMessage(error.message || "Erro ao executar ação.");
    }
  }

  const selectedDisparo = useMemo(
    () => disparos.find((item) => item.id === selectedDisparoId) || null,
    [disparos, selectedDisparoId]
  );

  const connectedInstances = useMemo(
    () =>
      instances.filter((instance) =>
        ["connected", "open", "online"].includes(String(instance?.status || "").toLowerCase())
      ),
    [instances]
  );

  const whatsappTabs = [
    { id: "config", label: "Configuração", icon: "⚙" },
    { id: "instances", label: "Instâncias", icon: "◎" },
    { id: "templates", label: "Templates", icon: "✎" },
    { id: "disparos", label: "Disparos", icon: "▶" },
  ];

  return (
    <div className="space-y-6">
      {statusMessage ? (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          {statusMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {whatsappTabs.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {activeTab === "config" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SectionCard title="Configuração do disparo" subtitle="Mesmo espírito do modal antigo, mas sem depender de magia frágil do navegador.">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Nome do disparo</span>
                  <input
                    value={disparoNome}
                    onChange={(e) => setDisparoNome(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Prioridade</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Velocidade de digitação</span>
                  <select
                    value={typingSpeed}
                    onChange={(e) => setTypingSpeed(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                  >
                    {TYPING_SPEED_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Delay entre mensagens</span>
                  <input
                    type="number"
                    value={delayEntreMensagens}
                    onChange={(e) => setDelayEntreMensagens(Number(e.target.value || 1))}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Delay entre instâncias</span>
                  <input
                    type="number"
                    value={delayEntreInstancias}
                    onChange={(e) => setDelayEntreInstancias(Number(e.target.value || 1))}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="mb-4 text-lg font-semibold">Lista de Contatos</h3>

                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrigemLista("manual")}
                    className={`rounded-2xl px-4 py-2 text-sm transition ${
                      origemLista === "manual"
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrigemLista("excel")}
                    className={`rounded-2xl px-4 py-2 text-sm transition ${
                      origemLista === "excel"
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    Excel/CSV
                  </button>
                  <button
                    disabled
                    className="rounded-2xl bg-zinc-800 px-4 py-2 text-sm text-zinc-600 opacity-50"
                  >
                    Google Sheets
                  </button>
                </div>

                {origemLista === "manual" ? (
                  <>
                    <textarea
                      rows="8"
                      value={contactsText}
                      onChange={(e) => setContactsText(e.target.value)}
                      placeholder={`Formatos aceitos:
1. Só número: 48991234567
2. Com nome: João;48991234567
3. Completo: João;48991234567;INSS;12345;extra1;extra2`}
                      className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                    />
                    <p className="mt-2 text-xs text-zinc-500">
                      Formato: nome;telefone;produto;matricula;variavel1;variavel2
                    </p>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 p-6 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportExcel}
                      className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500/15 file:px-4 file:py-2 file:text-cyan-300"
                    />
                    {selectedFileName ? (
                      <p className="mt-3 text-sm text-zinc-500">Arquivo: {selectedFileName}</p>
                    ) : null}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleBuildContacts}
                    className="rounded-2xl bg-cyan-500/15 px-4 py-3 text-sm font-medium text-cyan-300"
                  >
                    Carregar contatos
                  </button>

                  <div className="rounded-2xl bg-zinc-800 px-4 py-3 text-sm text-zinc-300">
                    {contacts.length} contato(s) pronto(s)
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Resumo do disparo" subtitle="Leitura rápida antes de soltar o bicho no campo.">
              <div className="grid gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                  Nome: <strong>{disparoNome || "—"}</strong>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                  Prioridade: <strong>{priority}</strong>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                  Instâncias: <strong>{selectedInstances.length}</strong>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                  Contatos: <strong>{contacts.length}</strong>
                </div>
              </div>

              {selectedTemplateId ? (
                <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                  Template principal selecionado.
                </div>
              ) : null}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCreateDisparo}
                  disabled={loading}
                  className="w-full rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Criando..." : "Criar disparo"}
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {activeTab === "instances" ? (
        <SectionCard
          title="Instâncias e vínculo com agentes"
          subtitle="As instâncias vêm da Evolution e os agentes vêm do registry real do backend."
        >
          {loadingInstances ? (
            <div className="text-sm text-zinc-500">Carregando instâncias...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {instances.map((instance) => (
                <InstanceCard
                  key={instance.id}
                  instance={instance}
                  selected={selectedInstances.includes(instance.name)}
                  onToggle={handleToggleInstance}
                  agentBinding={instanceBindings[instance.name]}
                  onBindAgent={handleBindAgent}
                  agents={agents}
                />
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "templates" ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Criar ou editar template" subtitle="Mesmo arsenal do modal antigo.">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Nome do template</span>
                <input
                  value={templateNome}
                  onChange={(e) => setTemplateNome(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Conteúdo</span>
                <textarea
                  rows="8"
                  value={templateConteudo}
                  onChange={(e) => setTemplateConteudo(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="rounded-2xl bg-cyan-500/15 px-4 py-3 text-sm font-medium text-cyan-300"
                >
                  {editTemplateId ? "Atualizar template" : "Salvar template"}
                </button>

                {editTemplateId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditTemplateId(null);
                      setTemplateNome("");
                      setTemplateConteudo("");
                    }}
                    className="rounded-2xl bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300"
                  >
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Templates salvos" subtitle="Salvar, editar, excluir e selecionar. Sem mutilar o fluxo antigo.">
            <div className="grid gap-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplateId === template.id}
                  onSelect={handleUseTemplate}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                />
              ))}

              {templates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
                  Nenhum template salvo ainda.
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "disparos" ? (
        <div className="space-y-6">
          <SectionCard title="Disparos salvos" subtitle="Agora o backend segura a tocha; a tela só observa e comanda.">
            <div className="grid gap-4">
              {disparos.map((disparo) => {
                const percent = disparo.analytics?.total
                  ? Math.round(((disparo.analytics?.sent || 0) / disparo.analytics.total) * 100)
                  : 0;

                return (
                  <div
                    key={disparo.id}
                    onClick={() => setSelectedDisparoId(disparo.id)}
                    className={`cursor-pointer rounded-3xl border p-4 transition ${
                      selectedDisparoId === disparo.id
                        ? "border-cyan-500/30 bg-cyan-500/10"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-zinc-100">{disparo.name}</h3>
                        <p className="mt-1 text-xs text-zinc-500">{disparo.id}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <PriorityBadge priority={disparo.priority || "media"} />
                        <StatusBadge status={disparo.status}>{disparo.status}</StatusBadge>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                        <span>Progresso</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-cyan-500 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                        Total: <strong>{disparo.analytics?.total || 0}</strong>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                        Enviados: <strong>{disparo.analytics?.sent || 0}</strong>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                        Erros: <strong>{disparo.analytics?.failed || 0}</strong>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                        Respostas: <strong>{disparo.analytics?.responded || 0}</strong>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(disparo.instances || []).map((instanceName) => (
                        <Badge key={instanceName} className="border-zinc-700 bg-zinc-900 text-zinc-300">
                          {instanceName}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {disparo.status === "draft" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisparoAction("start", disparo.id);
                          }}
                          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200"
                        >
                          Iniciar
                        </button>
                      ) : null}

                      {disparo.status === "running" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisparoAction("pause", disparo.id);
                          }}
                          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200"
                        >
                          Pausar
                        </button>
                      ) : null}

                      {disparo.status === "paused" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisparoAction("resume", disparo.id);
                          }}
                          className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200"
                        >
                          Retomar
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisparoAction("delete", disparo.id);
                        }}
                        className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}

              {disparos.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950 p-8 text-center text-zinc-500">
                  Nenhum disparo salvo ainda.
                </div>
              ) : null}
            </div>
          </SectionCard>

          {selectedDisparo ? (
            <SectionCard title="Detalhes do disparo" subtitle="Contato por contato, sem adivinhação carnavalesca.">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
                  <h4 className="mb-3 text-base font-semibold">Resumo</h4>
                  <div className="grid gap-2 text-sm text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Status</span>
                      <span>{selectedDisparo.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Prioridade</span>
                      <span>{selectedDisparo.priority}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Delay</span>
                      <span>{selectedDisparo.delay_seconds}s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Criado em</span>
                      <span>{selectedDisparo.created_at}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
                  <h4 className="mb-3 text-base font-semibold">Instâncias vinculadas</h4>
                  <div className="grid gap-2">
                    {(selectedDisparo.instances || []).map((instanceName) => (
                      <div
                        key={instanceName}
                        className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-300"
                      >
                        <span>{instanceName}</span>
                        <span className="text-cyan-300">
                          {selectedDisparo.instance_bindings?.[instanceName]?.agentId || "sem agente"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
                <h4 className="mb-3 text-base font-semibold">Contatos</h4>
                <div className="max-h-96 grid gap-2 overflow-auto">
                  {(selectedDisparo.contacts || []).map((contact, index) => (
                    <div
                      key={contact.id || `${contact.telefone}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm"
                    >
                      <div>
                        <div className="font-medium text-zinc-100">
                          {contact.nome || contact.telefone}
                        </div>
                        <div className="text-xs text-zinc-500">{contact.telefone}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        {contact.erro ? <span className="text-xs text-rose-300">{contact.erro}</span> : null}
                        <StatusBadge status={contact.status || "pending"}>
                          {contact.status || "pending"}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SmsTab() {
  const [config, setConfig] = useState({ ip: "192.168.0.8", porta: "2333", delay: 8 });
  const [airmoreStatus, setAirmoreStatus] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateNome, setTemplateNome] = useState("");
  const [templateConteudo, setTemplateConteudo] = useState("");
  const [manualPhones, setManualPhones] = useState("");
  const [listName, setListName] = useState("");
  const [listPriority, setListPriority] = useState("media");
  const [scheduledAt, setScheduledAt] = useState("");
  const [queue, setQueue] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [reports, setReports] = useState({});
  const [history, setHistory] = useState([]);
  const schedulerRef = useRef(null);

  useEffect(() => {
    loadInitialData();
    schedulerRef.current = setInterval(() => {
      tickLists();
    }, 1000);
    return () => clearInterval(schedulerRef.current);
  }, [savedLists]);

  async function loadInitialData() {
    try {
      const [statusData, templatesData, reportsData, historyData] = await Promise.all([
        getAirMoreStatus(),
        listAirMoreTemplates(),
        getAirMoreReports(),
        getAirMoreHistory(),
      ]);

      setAirmoreStatus(statusData);
      setTemplates(templatesData || []);
      setReports(reportsData || {});
      setHistory(historyData || []);
      setSavedLists(sortListsByPriorityAndSchedule(loadAirMoreLists()));
      setStatusMessage("");
    } catch (error) {
      setStatusMessage(error.message || "Erro ao carregar módulo AirMore.");
    }
  }

  function persistLists(nextLists) {
    setSavedLists(nextLists);
    saveAirMoreLists(nextLists);
  }

async function handleConnect() {
  try {
    setLoadingConnect(true);
    setStatusMessage("Solicitando autorização no celular...");

    const result = await connectAirMore(config.ip, config.porta);
    setAirmoreStatus(result);

    if (result.connected && result.authorized) {
      setStatusMessage("AirMore conectado com sucesso.");
      return;
    }

    setStatusMessage(
      result.last_error || "A conexão não foi concluída. Verifique o celular."
    );
  } catch (error) {
    setStatusMessage(
      error.message || "Erro ao conectar AirMore. Verifique IP, porta e aceite no celular."
    );

    const statusData = await getAirMoreStatus().catch(() => null);
    if (statusData) {
      setAirmoreStatus(statusData);
    }
  } finally {
    setLoadingConnect(false);
  }
}  async function handleDisconnect() {
    try {
      await disconnectAirMore();
      const statusData = await getAirMoreStatus();
      setAirmoreStatus(statusData);
      setStatusMessage("AirMore desconectado.");
    } catch (error) {
      setStatusMessage(error.message || "Erro ao desconectar AirMore.");
    }
  }

  function handleTemplateSelect(id) {
    setSelectedTemplateId(id);
    const found = templates.find((item) => item.id === id);
    if (!found) return;
    setTemplateNome(found.nome || "");
    setTemplateConteudo(found.conteudo || "");
  }

  async function handleSaveTemplate() {
    try {
      if (!templateNome.trim()) return setStatusMessage("Informe o nome do template.");
      if (!templateConteudo.trim()) return setStatusMessage("Informe o conteúdo do template.");

      if (selectedTemplateId) {
        await updateAirMoreTemplate(selectedTemplateId, {
          nome: templateNome,
          conteudo: templateConteudo,
        });
        setStatusMessage("Template atualizado.");
      } else {
        await createAirMoreTemplate({
          nome: templateNome,
          conteudo: templateConteudo,
        });
        setStatusMessage("Template criado.");
      }

      const templatesData = await listAirMoreTemplates();
      setTemplates(templatesData || []);
      setSelectedTemplateId("");
      setTemplateNome("");
      setTemplateConteudo("");
    } catch (error) {
      setStatusMessage(error.message || "Erro ao salvar template.");
    }
  }

  async function handleDeleteTemplate() {
    try {
      if (!selectedTemplateId) return setStatusMessage("Selecione um template para excluir.");
      await deleteAirMoreTemplate(selectedTemplateId);
      const templatesData = await listAirMoreTemplates();
      setTemplates(templatesData || []);
      setSelectedTemplateId("");
      setTemplateNome("");
      setTemplateConteudo("");
      setStatusMessage("Template excluído.");
    } catch (error) {
      setStatusMessage(error.message || "Erro ao excluir template.");
    }
  }

  function handleBuildQueueFromManual() {
    const phones = normalizePhonesFromText(manualPhones);
    if (!phones.length) return setStatusMessage("Nenhum telefone válido encontrado.");
    setQueue(buildLeadQueueItems(phones));
    setStatusMessage(`Fila criada com ${phones.length} número(s).`);
  }

  function handleImportExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const data = new Uint8Array(loadEvent.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const phones = rows.flat().map((value) => String(value || "").trim()).filter(Boolean);
        const normalized = normalizePhonesFromText(phones.join("\n"));
        setQueue(buildLeadQueueItems(normalized));
        setStatusMessage(`Planilha importada com ${normalized.length} número(s).`);
      } catch (error) {
        setStatusMessage(error.message || "Erro ao importar planilha.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleSaveList() {
    if (!listName.trim()) return setStatusMessage("Informe o nome da lista.");
    if (!queue.length) return setStatusMessage("Monte a fila antes de salvar.");

    const template = templates.find((item) => item.id === selectedTemplateId) || {
      id: "",
      nome: templateNome || "Template manual",
      conteudo: templateConteudo || "",
    };

    const nextList = createListObject({
      nome: listName,
      prioridade: listPriority,
      scheduledAt,
      queue,
      template,
      delay: Number(config.delay || 8),
    });

    persistLists(sortListsByPriorityAndSchedule([...savedLists, nextList]));
    setQueue([]);
    setListName("");
    setScheduledAt("");
    setStatusMessage("Lista salva com sucesso.");
  }

  function handleDeleteList(listId) {
    persistLists(savedLists.filter((item) => item.id !== listId));
    setStatusMessage("Lista excluída.");
  }

  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDrop(index) {
    if (dragIndex === null || dragIndex === index) return;
    persistLists(reorderQueue(savedLists, dragIndex, index));
    setDragIndex(null);
  }

  async function tickLists() {
    const ordered = sortListsByPriorityAndSchedule(loadAirMoreLists());

    if (JSON.stringify(ordered) !== JSON.stringify(savedLists)) {
      setSavedLists(ordered);
    }

    const nextToRun = ordered.find((item) => item.status === "agendada");
    if (!nextToRun) return;

    const shouldStart =
      !nextToRun.scheduledAt || new Date(nextToRun.scheduledAt).getTime() <= Date.now();

    if (!shouldStart) return;

    const updated = ordered.map((item) =>
      item.id === nextToRun.id ? { ...item, status: "rodando" } : item
    );
    persistLists(updated);

    try {
      setLoadingSend(true);
      const result = await sendAirMoreBatch({
        mensagem: nextToRun.template?.conteudo || "",
        lista: nextToRun.queue || [],
        delay: nextToRun.delay || config.delay,
      });

      const finalLists = loadAirMoreLists().map((item) =>
        item.id === nextToRun.id
          ? {
              ...item,
              status: "concluida",
              concluidaEm: Date.now(),
              resultado: result,
            }
          : item
      );

      persistLists(sortListsByPriorityAndSchedule(finalLists));
      setReports(await getAirMoreReports());
      setHistory(await getAirMoreHistory());
      setStatusMessage(`Lista "${nextToRun.nome}" enviada.`);
    } catch (error) {
      setStatusMessage(error.message || "Erro ao enviar lista.");
    } finally {
      setLoadingSend(false);
    }
  }

  function handlePauseList(listId) {
    persistLists(savedLists.map((item) => (item.id === listId ? { ...item, status: "pausada" } : item)));
    setStatusMessage("Lista pausada.");
  }

  function handleResumeList(listId) {
    persistLists(
      sortListsByPriorityAndSchedule(
        savedLists.map((item) => (item.id === listId ? { ...item, status: "agendada" } : item))
      )
    );
    setStatusMessage("Lista reativada.");
  }

  function handleExportLists() {
    const rows = exportListsToXlsxRows(savedLists);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Listas SMS");
    XLSX.writeFile(workbook, "listas_sms.xlsx");
    setStatusMessage("Listas exportadas.");
  }

  const charCount = templateConteudo.length;

  return (
    <div className="space-y-6">
      {statusMessage ? (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <SectionCard title="Conexão AirMore" subtitle="Agora com status honesto de autorização.">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">IP</span>
                <input
                  value={config.ip}
                  onChange={(e) => setConfig((prev) => ({ ...prev, ip: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Porta</span>
                <input
                  value={config.porta}
                  onChange={(e) => setConfig((prev) => ({ ...prev, porta: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Delay padrão</span>
                <input
                  value={config.delay}
                  onChange={(e) => setConfig((prev) => ({ ...prev, delay: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConnect}
                disabled={loadingConnect}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200"
              >
                {loadingConnect ? "Conectando..." : "Conectar"}
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
              >
                Desconectar
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                Conectado: <strong>{airmoreStatus?.connected ? "Sim" : "Não"}</strong>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                Autorizado: <strong>{airmoreStatus?.authorized ? "Sim" : "Não"}</strong>
              </div>
            </div>

            {airmoreStatus?.last_error ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {airmoreStatus.last_error}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Templates SMS" subtitle="Mesmo módulo, sem modal.">
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Selecionar template</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                >
                  <option value="">Novo template</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Nome do template</span>
                <input
                  value={templateNome}
                  onChange={(e) => setTemplateNome(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Conteúdo</span>
                <textarea
                  rows={5}
                  value={templateConteudo}
                  onChange={(e) => setTemplateConteudo(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                />
              </label>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Máximo recomendado: 160</span>
                <span className={charCount >= 160 ? "text-rose-400" : charCount >= 120 ? "text-amber-400" : "text-zinc-400"}>
                  {charCount} caracteres
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200"
                >
                  {selectedTemplateId ? "Atualizar template" : "Salvar template"}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteTemplate}
                  className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                >
                  Excluir template
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Montar lista SMS" subtitle="Sem gambiarra, sem overlay, sem susto.">
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Números manuais</span>
                <textarea
                  rows={6}
                  value={manualPhones}
                  onChange={(e) => setManualPhones(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleBuildQueueFromManual}
                  className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100"
                >
                  Gerar fila
                </button>

                <label className="cursor-pointer rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
                  Importar Excel
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Nome da lista</span>
                  <input
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Prioridade</span>
                  <select
                    value={listPriority}
                    onChange={(e) => setListPriority(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Agendar para</span>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleSaveList}
                className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200"
              >
                Salvar lista
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Listas salvas"
            subtitle="Mesmo comportamento do módulo legado, mas estacionado na página."
            actions={
              <button
                type="button"
                onClick={handleExportLists}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100"
              >
                Exportar XLSX
              </button>
            }
          >
            <div className="space-y-4">
              {savedLists.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">{item.nome}</h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.scheduledAt ? `Agendado para ${formatDateTimeLocal(item.scheduledAt)}` : "Sem agendamento"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PriorityBadge priority={item.prioridade} />
                      <StatusBadge status={item.status}>{item.status}</StatusBadge>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.status === "rodando" ? (
                      <button
                        type="button"
                        onClick={() => handlePauseList(item.id)}
                        disabled={loadingSend}
                        className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200"
                      >
                        Pausar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResumeList(item.id)}
                        className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200"
                      >
                        Ativar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteList(item.id)}
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}

              {savedLists.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950 p-8 text-center text-zinc-500">
                  Nenhuma lista salva ainda.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Relatório do dia" subtitle="Números úteis. Sem verniz.">
              <div className="grid gap-2 text-sm text-zinc-300">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Total enviados</span>
                  <span>{reports?.total_enviados || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Sucessos</span>
                  <span className="text-emerald-300">{reports?.sucessos || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Erros</span>
                  <span className="text-rose-300">{reports?.erros || 0}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Histórico recente" subtitle="As últimas pegadas do módulo SMS.">
              <div className="grid gap-2">
                {history.slice(-5).reverse().map((item, index) => (
                  <div
                    key={`${item.data}-${index}`}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-300"
                  >
                    <div className="mb-1 text-xs text-zinc-500">{item.data}</div>
                    <div>Telefone: {item.telefone}</div>
                    <div className={String(item.status || "").startsWith("ERRO") ? "text-rose-300" : "text-emerald-300"}>
                      {item.status}
                    </div>
                  </div>
                ))}

                {!history.length ? (
                  <div className="text-sm text-zinc-500">Sem histórico ainda.</div>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProspeccaoPage() {
  const [activeTab, setActiveTab] = useState("whatsapp");

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Prospecção
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
            Acionamento comercial
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            WhatsApp e SMS agora vivem em uma página própria. O WhatsApp voltou ao espírito do
            modal antigo, mas sem depender de ficar aberto. O SMS segue separado, como um reino vizinho
            com suas próprias manias.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {activeTab === "whatsapp" ? <WhatsAppTab /> : <SmsTab />}
      </div>
    </div>
  );
}