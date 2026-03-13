import { jarvisBus } from "../../core/jarvis/eventBus";

const AIRMORE_BASE_URL =
  import.meta.env.VITE_AIRMORE_BASE_URL || "http://127.0.0.1:5000";

const STORAGE_KEY = "jarvis_airmore_lists";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.error ||
        data?.last_error ||
        "Falha na comunicação com o bridge do AirMore."
    );
  }

  return data;
}

export async function getAirMoreStatus() {
  const response = await fetch(`${AIRMORE_BASE_URL}/status`);
  return parseResponse(response);
}

export async function connectAirMore(ip, porta) {
  const response = await fetch(`${AIRMORE_BASE_URL}/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ip,
      porta: Number(porta),
    }),
  });

  const data = await parseResponse(response);

  return data;
}

export async function disconnectAirMore() {
  const response = await fetch(`${AIRMORE_BASE_URL}/disconnect`, {
    method: "POST",
  });
  return parseResponse(response);
}

export async function listAirMoreTemplates() {
  const response = await fetch(`${AIRMORE_BASE_URL}/templates`);
  return parseResponse(response);
}

export async function createAirMoreTemplate(payload) {
  const response = await fetch(`${AIRMORE_BASE_URL}/templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nome: payload.nome,
      conteudo: payload.conteudo,
    }),
  });

  const data = await parseResponse(response);
  return data.template;
}

export async function updateAirMoreTemplate(id, payload) {
  const response = await fetch(`${AIRMORE_BASE_URL}/templates/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nome: payload.nome,
      conteudo: payload.conteudo,
    }),
  });

  const data = await parseResponse(response);
  return data.template;
}

export async function deleteAirMoreTemplate(id) {
  const response = await fetch(`${AIRMORE_BASE_URL}/templates/${id}`, {
    method: "DELETE",
  });

  return parseResponse(response);
}

export async function sendAirMoreBatch({ mensagem, lista, delay }) {
  const response = await fetch(`${AIRMORE_BASE_URL}/send_batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mensagem,
      lista,
      delay: Number(delay) || 5,
    }),
  });

  return parseResponse(response);
}

export async function getAirMoreReports() {
  const response = await fetch(`${AIRMORE_BASE_URL}/reports`);
  return parseResponse(response);
}

export async function getAirMoreHistory() {
  const response = await fetch(`${AIRMORE_BASE_URL}/history`);
  return parseResponse(response);
}

export function normalizePhonesFromText(text) {
  if (!text) return [];

  const tokens = text
    .split(/\r?\n|,|;|\t/)
    .map((item) => item.trim())
    .filter(Boolean);

  const phones = tokens
    .map((item) => item.replace(/\D/g, ""))
    .filter((item) => item.length >= 10);

  return [...new Set(phones)];
}

export function buildLeadQueueItems(phones) {
  return phones.map((phone, index) => ({
    id: `${phone}-${index}-${Date.now()}`,
    telefone: phone,
    enviado: false,
    ordem: index + 1,
    vars: {},
  }));
}

export function priorityWeight(priority) {
  if (priority === "alta") return 1;
  if (priority === "media") return 2;
  return 3;
}

export function reorderQueue(list, fromIndex, toIndex) {
  const clone = [...list];
  const [moved] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, moved);

  return clone.map((item, index) => ({
    ...item,
    ordem: index + 1,
  }));
}

export function saveAirMoreLists(lists) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function loadAirMoreLists() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function formatDateTimeLocal(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR");
}

export function createListObject({
  nome,
  prioridade,
  scheduledAt,
  queue,
  template,
  delay,
}) {
  return {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nome: nome?.trim() || "Lista sem nome",
    prioridade: prioridade || "media",
    delay: Number(delay) || 8,
    scheduledAt: scheduledAt || "",
    createdAt: new Date().toISOString(),
    status: "agendada",
    queue: Array.isArray(queue) ? queue : [],
    template: template || null,
    sentCountFake: 0,
    totalLeads: Array.isArray(queue) ? queue.length : 0,
    leads: Array.isArray(queue) ? queue : [],
    logs: [],
  };
}

export function sortListsByPriorityAndSchedule(lists) {
  return [...lists].sort((a, b) => {
    const pa = priorityWeight(a.prioridade);
    const pb = priorityWeight(b.prioridade);

    if (pa !== pb) return pa - pb;

    const da = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const db = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;

    return da - db;
  });
}

export function exportListsToXlsxRows(lists) {
  const rows = [];

  lists.forEach((list) => {
    (list.leads || []).forEach((lead, index) => {
      rows.push({
        Lista: list.nome,
        Prioridade: list.prioridade,
        Template: list.template?.nome || "Manual",
        DelaySegundos: list.delay,
        DataHoraProgramada: list.scheduledAt || "",
        StatusLista: list.status,
        OrdemLead: index + 1,
        Telefone: lead.telefone,
        EnviadoFake: lead.enviado ? "Sim" : "Não",
      });
    });
  });

  return rows;
}

export function dispatchJarvisAirMoreEvent(type, payload) {
  jarvisBus.emit(type, payload, {
    source: "airmore",
    module: "airmore_service",
    emittedAt: new Date().toISOString(),
  });
}