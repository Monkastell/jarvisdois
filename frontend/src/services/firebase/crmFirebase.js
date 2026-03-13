import { auth, db, storage } from "./config";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { notifyJarvisLeadEvent } from "../jarvisCrm";
function defaultColumns() {
  return [
    { id: "novos", title: "Novo", name: "Novo", color: "blue", fixed: true },
    {
      id: "negociacao",
      title: "Negociação",
      name: "Negociação",
      color: "amber",
      fixed: true,
    },
    {
      id: "simulacao",
      title: "Simulação",
      name: "Simulação",
      color: "violet",
      fixed: true,
    },
    {
      id: "digitado",
      title: "Digitado",
      name: "Digitado",
      color: "emerald",
      fixed: true,
    },
  ];
}

function getCurrentUid() {
  return auth.currentUser?.uid || null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeColumn(column) {
  return {
    id: column.id,
    title: column.title || column.name || "Coluna",
    name: column.name || column.title || "Coluna",
    color: column.color || "blue",
    fixed: !!column.fixed,
  };
}

function normalizeFileEntry(file) {
  if (!file) return null;

  return {
    nome: file.nome || file.name || "arquivo",
    tipo: file.tipo || file.type || "",
    tamanho: Number(file.tamanho || file.size || 0),
    url: file.url || "",
    caminho: file.caminho || "",
    enviadoEm: file.enviadoEm || Date.now(),
  };
}

function normalizeCompliance(rawCompliance = {}) {
  return {
    status: rawCompliance.status || "pendente",
    observacoes: rawCompliance.observacoes || "",
    ultimaAuditoriaEm: rawCompliance.ultimaAuditoriaEm || "",
    ultimaCapturaEm: rawCompliance.ultimaCapturaEm || "",
    enabled: !!rawCompliance.enabled,
    conversationCapture: !!rawCompliance.conversationCapture,
    historico: safeArray(rawCompliance.historico).map((item) => ({
      tipo: item?.tipo || "evento",
      descricao: item?.descricao || "",
      data: item?.data || Date.now(),
      origem: item?.origem || "manual",
    })),
    evidencias: safeArray(rawCompliance.evidencias)
      .map(normalizeFileEntry)
      .filter(Boolean),
  };
}

function normalizeLead(rawLead, docId = null) {
  return {
    id: rawLead.id || docId || String(Date.now()),
    nome: rawLead.nome || rawLead.cliente || rawLead.name || "",
    telefone: rawLead.telefone || rawLead.phone || "",
    valor: Number(rawLead.valor || 0),
    senhaContracheque: rawLead.senhaContracheque || "",
    senhaPortal: rawLead.senhaPortal || "",
    nascimento: rawLead.nascimento || rawLead.data_nascimento || "",
    naturalidade: rawLead.naturalidade || "",
    estado: rawLead.estado || "",
    nacionalidade: rawLead.nacionalidade || "Brasileiro",
    estadoCivil: rawLead.estadoCivil || "",
    documento: rawLead.documento || "",
    orgao: rawLead.orgao || "",
    dataExpedicao: rawLead.dataExpedicao || "",
    mae: rawLead.mae || "",
    pai: rawLead.pai || "",
    ppe: !!rawLead.ppe,
    email: rawLead.email || "",
    cpf: rawLead.cpf || "",
    cep: rawLead.cep || "",
    endereco: rawLead.endereco || "",
    complemento: rawLead.complemento || "",
    bairro: rawLead.bairro || "",
    cidade: rawLead.cidade || "",
    uf: rawLead.uf || "",
    endComercial: rawLead.endComercial || "",
    compComercial: rawLead.compComercial || "",
    bairroComercial: rawLead.bairroComercial || "",
    cidadeComercial: rawLead.cidadeComercial || "",
    ufComercial: rawLead.ufComercial || "",
    bancoCodigo: rawLead.bancoCodigo || "",
    agencia: rawLead.agencia || "",
    conta: rawLead.conta || "",
    digito: rawLead.digito || "",
    tipoConta: rawLead.tipoConta || "",
    pix: rawLead.pix || "",
    obs: rawLead.obs || rawLead.observacoes || "",
    produto: rawLead.produto || "",
    matricula: rawLead.matricula || "",
    origem: rawLead.origem || "manual",
    temperatura: rawLead.temperatura || "frio",
    agenteAtual: rawLead.agenteAtual || rawLead.current_agent || "receptivo",
    estadoConversa:
      rawLead.estadoConversa || rawLead.conversation_state || "bot_started",
    status: rawLead.status || "novos",
    favorito: !!rawLead.favorito,
    marcadores: safeArray(rawLead.marcadores || rawLead.markers),
    parceiroId: rawLead.parceiroId || "",
    arquivos: safeArray(rawLead.arquivos).map(normalizeFileEntry).filter(Boolean),
    compliance: normalizeCompliance(rawLead.compliance || {}),
    createdAt: rawLead.createdAt || Date.now(),
    updatedAt: rawLead.updatedAt || Date.now(),
  };
}

async function ensureKanbanConfig(uid) {
  const kanbanRef = doc(db, "kanban_config", uid);
  const kanbanSnap = await getDoc(kanbanRef);

  if (!kanbanSnap.exists()) {
    const config = {
      parceiroId: uid,
      viewMode: "kanban",
      columns: defaultColumns(),
    };
    await setDoc(kanbanRef, config);
    return config;
  }

  const config = kanbanSnap.data();
  if (!Array.isArray(config.columns) || config.columns.length < 1) {
    config.columns = defaultColumns();
    await setDoc(kanbanRef, config, { merge: true });
  }

  return config;
}

async function uploadLeadFiles(uid, leadId, files = [], folder = "arquivos") {
  if (!Array.isArray(files) || files.length === 0) return [];

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const fileName = `${Date.now()}-${file.name}`;
      const fileRef = ref(
        storage,
        `crm/${uid}/leads/${leadId}/${folder}/${fileName}`
      );

      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      return {
        nome: file.name,
        tipo: file.type || "",
        tamanho: Number(file.size || 0),
        url,
        caminho: fileRef.fullPath,
        enviadoEm: Date.now(),
      };
    })
  );

  return uploaded;
}

export async function getCRMBoardFromFirebase() {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("Usuário não autenticado no Firebase.");
  }

  const config = await ensureKanbanConfig(uid);

  const leadsQuery = query(
    collection(db, "leads"),
    where("parceiroId", "==", uid)
  );

  const leadsSnap = await getDocs(leadsQuery);

  const leads = leadsSnap.docs
    .map((docSnap) => normalizeLead(docSnap.data(), docSnap.id))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  return {
    columns: (config.columns || []).map(normalizeColumn),
    leads,
    source: "firebase",
  };
}

export async function createLeadInFirebase(payload) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("Usuário não autenticado no Firebase.");
  }

  const pendingFiles = safeArray(payload.pendingFiles);
  const pendingComplianceFiles = safeArray(payload.pendingComplianceFiles);

  const normalized = normalizeLead({
    ...payload,
    parceiroId: uid,
    favorito: !!payload.favorito,
    arquivos: safeArray(payload.arquivos),
    compliance: payload.compliance || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const leadToSave = { ...normalized };
  delete leadToSave.id;

  const docRef = await addDoc(collection(db, "leads"), leadToSave);

  const uploadedFiles = await uploadLeadFiles(uid, docRef.id, pendingFiles, "arquivos");
  const uploadedEvidence = await uploadLeadFiles(
    uid,
    docRef.id,
    pendingComplianceFiles,
    "compliance"
  );

  const finalLead = normalizeLead(
    {
      ...normalized,
      arquivos: [...safeArray(normalized.arquivos), ...uploadedFiles],
      compliance: {
        ...normalizeCompliance(normalized.compliance),
        evidencias: [
          ...safeArray(normalized.compliance?.evidencias),
          ...uploadedEvidence,
        ],
        historico: [
          {
            tipo: "criacao",
            descricao: "Lead criado no CRM",
            data: Date.now(),
            origem: "sistema",
          },
          ...safeArray(normalized.compliance?.historico),
        ],
      },
      updatedAt: Date.now(),
    },
    docRef.id
  );

  const leadToUpdate = { ...finalLead };
  delete leadToUpdate.id;

  await updateDoc(doc(db, "leads", docRef.id), leadToUpdate);
  try {
    await notifyJarvisLeadEvent({
      eventType: "lead_created",
      lead: finalLead,
    });
  } catch (error) {
    console.error("Falha ao notificar Jarvis na criação do lead:", error);
  }
  return {
    ok: true,
    lead: finalLead,
    source: "firebase",
  };
}

export async function updateLeadInFirebase(leadId, payload) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("Usuário não autenticado no Firebase.");
  }

  if (!leadId) {
    throw new Error("Lead inválido.");
  }

  const currentRef = doc(db, "leads", leadId);
  const currentSnap = await getDoc(currentRef);

  if (!currentSnap.exists()) {
    throw new Error("Lead não encontrado.");
  }

  const currentLead = normalizeLead(currentSnap.data(), currentSnap.id);

  const pendingFiles = safeArray(payload.pendingFiles);
  const pendingComplianceFiles = safeArray(payload.pendingComplianceFiles);

  const uploadedFiles = await uploadLeadFiles(uid, leadId, pendingFiles, "arquivos");
  const uploadedEvidence = await uploadLeadFiles(
    uid,
    leadId,
    pendingComplianceFiles,
    "compliance"
  );

  const normalized = normalizeLead({
    ...currentLead,
    ...payload,
    parceiroId: uid,
    arquivos: [
      ...safeArray(payload.arquivos ?? currentLead.arquivos),
      ...uploadedFiles,
    ],
    compliance: {
      ...normalizeCompliance(currentLead.compliance),
      ...normalizeCompliance(payload.compliance || {}),
      evidencias: [
        ...safeArray(payload.compliance?.evidencias ?? currentLead.compliance?.evidencias),
        ...uploadedEvidence,
      ],
      historico: [
        ...safeArray(payload.compliance?.historico ?? currentLead.compliance?.historico),
        {
          tipo: "edicao",
          descricao: "Lead atualizado no CRM",
          data: Date.now(),
          origem: "sistema",
        },
      ],
    },
    updatedAt: Date.now(),
  }, leadId);

  const leadToSave = { ...normalized };
  delete leadToSave.id;

  await updateDoc(currentRef, leadToSave);

  return {
    ok: true,
    lead: normalized,
    source: "firebase",
  };
}

export async function updateLeadStatusInFirebase(leadId, status) {
  if (!leadId) {
    throw new Error("Lead inválido.");
  }

  const leadRef = doc(db, "leads", leadId);
  const leadSnap = await getDoc(leadRef);

  if (!leadSnap.exists()) {
    throw new Error("Lead não encontrado.");
  }

  const currentLead = normalizeLead(leadSnap.data(), leadSnap.id);

  const updatedLead = normalizeLead(
    {
      ...currentLead,
      status,
      updatedAt: Date.now(),
    },
    leadId
  );

  const leadToSave = { ...updatedLead };
  delete leadToSave.id;

  await updateDoc(leadRef, leadToSave);

  try {
    await notifyJarvisLeadEvent({
      eventType: "lead_moved",
      lead: updatedLead,
      previous: currentLead,
    });
  } catch (error) {
    console.error("Falha ao notificar Jarvis na mudança de status:", error);
  }

  return {
    ok: true,
    leadId,
    status,
    lead: updatedLead,
    source: "firebase",
  };
}
export async function toggleFavoriteInFirebase(leadId, favorito) {
  if (!leadId) {
    throw new Error("Lead inválido.");
  }

  await updateDoc(doc(db, "leads", leadId), {
    favorito,
    updatedAt: Date.now(),
  });

  return {
    ok: true,
    leadId,
    favorito,
    source: "firebase",
  };
}

export async function deleteLeadInFirebase(leadId) {
  if (!leadId) {
    throw new Error("Lead inválido.");
  }

  await deleteDoc(doc(db, "leads", leadId));

  return {
    ok: true,
    leadId,
    source: "firebase",
  };
}

export async function createColumnInFirebase(column) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("Usuário não autenticado no Firebase.");
  }

  const config = await ensureKanbanConfig(uid);

  const nextColumns = [
    ...(config.columns || []),
    {
      id: column.id,
      title: column.title,
      name: column.title,
      color: column.color || "blue",
      fixed: false,
    },
  ];

  await setDoc(
    doc(db, "kanban_config", uid),
    {
      ...config,
      parceiroId: uid,
      columns: nextColumns,
    },
    { merge: true }
  );

  return {
    ok: true,
    column,
    source: "firebase",
  };
}

export async function deleteColumnInFirebase(columnId) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("Usuário não autenticado no Firebase.");
  }

  const config = await ensureKanbanConfig(uid);
  const currentColumns = config.columns || [];
  const target = currentColumns.find((column) => column.id === columnId);

  if (!target) {
    throw new Error("Coluna não encontrada.");
  }

  if (target.fixed) {
    throw new Error("Esta coluna está travada e não pode ser excluída.");
  }

  const leadsQuery = query(
    collection(db, "leads"),
    where("parceiroId", "==", uid)
  );
  const leadsSnap = await getDocs(leadsQuery);
  const hasLeads = leadsSnap.docs.some(
    (docSnap) => (docSnap.data()?.status || "") === columnId
  );

  if (hasLeads) {
    throw new Error("Existem leads nesta coluna. Remova ou mova os leads antes de excluir.");
  }

  const nextColumns = currentColumns.filter((column) => column.id !== columnId);

  await setDoc(
    doc(db, "kanban_config", uid),
    {
      ...config,
      columns: nextColumns,
    },
    { merge: true }
  );

  return {
    ok: true,
    columnId,
    source: "firebase",
  };
}

export async function reorderColumnsInFirebase(columnIds) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("Usuário não autenticado no Firebase.");
  }

  const config = await ensureKanbanConfig(uid);
  const currentColumns = config.columns || [];

  const reordered = [
    ...currentColumns.filter((column) => column.fixed),
    ...columnIds
      .map((id) => currentColumns.find((column) => column.id === id))
      .filter((column) => column && !column.fixed),
  ];

  await setDoc(
    doc(db, "kanban_config", uid),
    {
      ...config,
      columns: reordered,
    },
    { merge: true }
  );

  return {
    ok: true,
    columnIds,
    source: "firebase",
  };
}

export async function toggleColumnLockInFirebase(columnId, fixed) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("Usuário não autenticado no Firebase.");
  }

  const config = await ensureKanbanConfig(uid);
  const nextColumns = (config.columns || []).map((column) =>
    column.id === columnId ? { ...column, fixed } : column
  );

  await setDoc(
    doc(db, "kanban_config", uid),
    {
      ...config,
      columns: nextColumns,
    },
    { merge: true }
  );

  return {
    ok: true,
    columnId,
    fixed,
    source: "firebase",
  };
}

export async function registerComplianceEventInFirebase(leadId, event) {
  const uid = getCurrentUid();

  if (!uid) {
    throw new Error("Usuário não autenticado no Firebase.");
  }

  if (!leadId) {
    throw new Error("Lead inválido.");
  }

  const leadRef = doc(db, "leads", leadId);
  const leadSnap = await getDoc(leadRef);

  if (!leadSnap.exists()) {
    throw new Error("Lead não encontrado.");
  }

  const currentLead = normalizeLead(leadSnap.data(), leadSnap.id);
  const nextHistory = [
    ...safeArray(currentLead.compliance?.historico),
    {
      tipo: event?.tipo || "evento",
      descricao: event?.descricao || "Evento de compliance registrado",
      data: Date.now(),
      origem: event?.origem || "manual",
    },
  ];

  await updateDoc(leadRef, {
    compliance: {
      ...normalizeCompliance(currentLead.compliance),
      historico: nextHistory,
      ultimaAuditoriaEm: Date.now(),
    },
    updatedAt: Date.now(),
  });

  return {
    ok: true,
    leadId,
    source: "firebase",
  };
}