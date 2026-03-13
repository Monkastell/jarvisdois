import { useEffect, useMemo, useState } from "react";
import {
  createColumnInFirebase,
  createLeadInFirebase,
  deleteColumnInFirebase,
  deleteLeadInFirebase,
  getCRMBoardFromFirebase,
  reorderColumnsInFirebase,
  toggleColumnLockInFirebase,
  toggleFavoriteInFirebase,
  updateLeadInFirebase,
  updateLeadStatusInFirebase,
} from "../../services/firebase/crmFirebase";
import LeadModal from "../../components/crm/LeadModal";

const emptyLead = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  origem: "manual",
  produto: "",
  matricula: "",
  valor: "",
  temperatura: "frio",
  agenteAtual: "receptivo",
  status: "novos",
  estadoConversa: "bot_started",
  nascimento: "",
  naturalidade: "",
  estado: "",
  nacionalidade: "Brasileiro",
  estadoCivil: "",
  documento: "",
  orgao: "",
  dataExpedicao: "",
  mae: "",
  pai: "",
  cep: "",
  endereco: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  bancoCodigo: "",
  agencia: "",
  conta: "",
  digito: "",
  tipoConta: "",
  pix: "",
  senhaContracheque: "",
  senhaPortal: "",
  obs: "",
  marcadores: [],
  favorito: false,
  arquivos: [],
  pendingFiles: [],
  compliance: {
    status: "pendente",
    observacoes: "",
    historico: [],
    evidencias: [],
    ultimaAuditoriaEm: null,
  },
  pendingComplianceFiles: [],
};

function CRMPage() {
  const [columns, setColumns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [draggedColumnId, setDraggedColumnId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState(emptyLead);
  const [editingLeadId, setEditingLeadId] = useState(null);

  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [search, setSearch] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  async function loadBoard() {
    setLoading(true);
    try {
      const data = await getCRMBoardFromFirebase();
      setColumns(data.columns || []);
      setLeads(data.leads || []);
    } catch (error) {
      console.error("Erro ao carregar CRM:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const searchable = [
        lead.nome,
        lead.cpf,
        lead.telefone,
        lead.produto,
        lead.matricula,
        lead.email,
        ...(Array.isArray(lead.marcadores) ? lead.marcadores : []),
      ]
        .join(" ")
        .toLowerCase();

      const matchSearch = searchable.includes(search.toLowerCase());
      const matchFavorite = onlyFavorites ? !!lead.favorito : true;

      return matchSearch && matchFavorite;
    });
  }, [leads, search, onlyFavorites]);

  const leadsByStatus = useMemo(() => {
    const grouped = {};
    columns.forEach((column) => {
      grouped[column.id] = [];
    });

    filteredLeads.forEach((lead) => {
      if (!grouped[lead.status]) grouped[lead.status] = [];
      grouped[lead.status].push(lead);
    });

    return grouped;
  }, [columns, filteredLeads]);

  function resetModalState() {
    setShowLeadModal(false);
    setEditingLeadId(null);
    setLeadForm({ ...emptyLead });
  }

  function openLeadModal(statusId = "novos") {
    setEditingLeadId(null);
    setLeadForm({
      ...emptyLead,
      status: statusId,
    });
    setShowLeadModal(true);
  }

  function openEditLead(lead) {
    setEditingLeadId(lead.id);
    setLeadForm({
      ...emptyLead,
      ...lead,
      marcadores: Array.isArray(lead.marcadores) ? lead.marcadores : [],
      arquivos: Array.isArray(lead.arquivos) ? lead.arquivos : [],
      pendingFiles: [],
      compliance: {
        ...emptyLead.compliance,
        ...(lead.compliance || {}),
        historico: Array.isArray(lead?.compliance?.historico)
          ? lead.compliance.historico
          : [],
        evidencias: Array.isArray(lead?.compliance?.evidencias)
          ? lead.compliance.evidencias
          : [],
      },
      pendingComplianceFiles: [],
    });
    setShowLeadModal(true);
  }

  function handleLeadDragStart(leadId) {
    setDraggedLeadId(leadId);
  }

  function handleLeadDragEnd() {
    setDraggedLeadId(null);
    setDragOverColumnId(null);
  }

  async function handleLeadDrop(columnId) {
    if (!draggedLeadId) return;

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === draggedLeadId ? { ...lead, status: columnId } : lead
      )
    );

    try {
      await updateLeadStatusInFirebase(draggedLeadId, columnId);
    } catch (error) {
      console.error("Erro ao mover lead:", error);
      await loadBoard();
    } finally {
      setDraggedLeadId(null);
      setDragOverColumnId(null);
    }
  }

  function handleColumnDragStart(column) {
    if (column.fixed) return;
    setDraggedColumnId(column.id);
  }

  function handleColumnDragEnd() {
    setDraggedColumnId(null);
  }

  async function handleColumnDrop(targetColumnId) {
    if (!draggedColumnId || draggedColumnId === targetColumnId) return;

    const currentIndex = columns.findIndex((col) => col.id === draggedColumnId);
    const targetIndex = columns.findIndex((col) => col.id === targetColumnId);

    if (currentIndex === -1 || targetIndex === -1) return;

    const draggedColumn = columns[currentIndex];
    if (draggedColumn?.fixed) return;

    const updatedColumns = [...columns];
    const [movedColumn] = updatedColumns.splice(currentIndex, 1);
    updatedColumns.splice(targetIndex, 0, movedColumn);

    setColumns(updatedColumns);
    setDraggedColumnId(null);

    try {
      await reorderColumnsInFirebase(updatedColumns.map((column) => column.id));
    } catch (error) {
      console.error("Erro ao reordenar colunas:", error);
      await loadBoard();
    }
  }

  async function handleCreateOrUpdateLead(e) {
    e.preventDefault();

    if (!leadForm.nome?.trim()) return;

    try {
      if (editingLeadId) {
        const result = await updateLeadInFirebase(editingLeadId, {
          ...leadForm,
          valor: Number(leadForm.valor) || 0,
        });

        setLeads((prev) =>
          prev.map((lead) => (lead.id === editingLeadId ? result.lead : lead))
        );
      } else {
        const result = await createLeadInFirebase({
          ...leadForm,
          valor: Number(leadForm.valor) || 0,
        });

        setLeads((prev) => [result.lead, ...prev]);
      }

      resetModalState();
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      alert("Não foi possível salvar o lead.");
    }
  }

  async function handleDeleteLead() {
    if (!editingLeadId) return;

    try {
      await deleteLeadInFirebase(editingLeadId);
      setLeads((prev) => prev.filter((lead) => lead.id !== editingLeadId));
      resetModalState();
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      alert("Não foi possível excluir o lead.");
    }
  }

  async function handleCreateColumn(e) {
    e.preventDefault();

    const cleanTitle = newColumnTitle.trim();
    if (!cleanTitle) return;

    const id = cleanTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");

    const column = { id, title: cleanTitle, fixed: false };

    try {
      setColumns((prev) => [...prev, column]);
      await createColumnInFirebase(column);
      setNewColumnTitle("");
      await loadBoard();
    } catch (error) {
      console.error("Erro ao criar coluna:", error);
      alert("Não foi possível criar a coluna.");
      await loadBoard();
    }
  }

  async function handleDeleteColumn(column) {
    try {
      await deleteColumnInFirebase(column.id);
      setColumns((prev) => prev.filter((item) => item.id !== column.id));
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleToggleColumnLock(column) {
    const nextFixed = !column.fixed;

    try {
      await toggleColumnLockInFirebase(column.id, nextFixed);
      setColumns((prev) =>
        prev.map((item) =>
          item.id === column.id ? { ...item, fixed: nextFixed } : item
        )
      );
    } catch (error) {
      console.error("Erro ao travar coluna:", error);
    }
  }

  async function handleToggleFavorite(lead) {
    const next = !lead.favorito;

    try {
      await toggleFavoriteInFirebase(lead.id, next);
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id ? { ...item, favorito: next } : item
        )
      );
    } catch (error) {
      console.error("Erro ao favoritar lead:", error);
    }
  }

  function getTempStyle(temp) {
    if (temp === "quente") {
      return "bg-red-500/15 text-red-300 border border-red-500/20";
    }
    if (temp === "morno") {
      return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20";
    }
    return "bg-blue-500/15 text-blue-300 border border-blue-500/20";
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-zinc-400">Carregando CRM...</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-zinc-400">
            </p>
          </div>
        </div>

        <div className="mt-1 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, telefone, produto, tag..."
            className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
          />

          <button
            type="button"
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className={`rounded-2xl px-4 py-3 text-sm ${
              onlyFavorites
                ? "bg-yellow-500/15 text-yellow-300"
                : "bg-zinc-950 text-zinc-400"
            }`}
          >
            {onlyFavorites ? "⭐ Mostrando favoritos" : "Mostrar favoritos"}
          </button>
        </div>
      </section>

      <section className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {columns.map((column) => {
            const columnLeads = leadsByStatus[column.id] || [];
            const isDragOver = dragOverColumnId === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedColumnId) return;
                }}
                onDrop={() => {
                  if (draggedColumnId) handleColumnDrop(column.id);
                }}
                className="w-[360px] shrink-0 rounded-3xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-white">{column.title}</h4>
                    <p className="text-xs text-zinc-500">
                      {columnLeads.length} lead(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLeadModal(column.id)}
                      className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/20"
                      title="Adicionar lead"
                    >
                      + Lead
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleColumnLock(column)}
                      className="rounded-xl bg-zinc-950 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800"
                      title="Travar / destravar coluna"
                    >
                      {column.fixed ? "🔒" : "🔓"}
                    </button>

                    {!column.fixed && (
                      <>
                        <button
                          type="button"
                          draggable
                          onDragStart={() => handleColumnDragStart(column)}
                          onDragEnd={handleColumnDragEnd}
                          className="cursor-grab rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 active:cursor-grabbing"
                          title="Arrastar coluna"
                        >
                          ⋮⋮
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(column)}
                          className="rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
                          title="Excluir coluna"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedLeadId) {
                      setDragOverColumnId(column.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverColumnId === column.id) {
                      setDragOverColumnId(null);
                    }
                  }}
                  onDrop={() => handleLeadDrop(column.id)}
                  className={`min-h-[620px] rounded-2xl p-3 transition ${
                    isDragOver
                      ? "bg-cyan-500/5 ring-2 ring-cyan-500/30"
                      : "bg-transparent"
                  }`}
                >
                  <div className="space-y-3">
                    {columnLeads.map((lead) => (
                      <article
                        key={lead.id}
                        draggable
                        onDragStart={() => handleLeadDragStart(lead.id)}
                        onDragEnd={handleLeadDragEnd}
                        onDoubleClick={() => openEditLead(lead)}
                        className="cursor-grab rounded-2xl border border-zinc-800 bg-zinc-950 p-4 active:cursor-grabbing"
                      >
                        <div className="mb-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => openEditLead(lead)}
                            className="block w-full truncate text-left font-medium text-white hover:text-cyan-300"
                          >
                            {lead.nome}
                          </button>
                          <p className="truncate text-xs text-zinc-500">
                            {lead.telefone || "Sem telefone"}
                          </p>
                        </div>

                        <div className="space-y-1 text-sm text-zinc-300">
                          <p><span className="text-zinc-500">CPF:</span> {lead.cpf || "-"}</p>
                          <p><span className="text-zinc-500">Produto:</span> {lead.produto || "-"}</p>
                          <p><span className="text-zinc-500">Origem:</span> {lead.origem || "-"}</p>
                          <p><span className="text-zinc-500">Agente:</span> {lead.agenteAtual || "receptivo"}</p>
                          <p><span className="text-zinc-500">Valor:</span> {formatMoney(lead.valor)}</p>
                        </div>

                        {Array.isArray(lead.marcadores) && lead.marcadores.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {lead.marcadores.slice(0, 6).map((marker) => (
                              <span
                                key={marker}
                                className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-cyan-300"
                              >
                                #{marker}
                              </span>
                            ))}

                            {lead.marcadores.length > 6 && (
                              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400">
                                +{lead.marcadores.length - 6}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] ${getTempStyle(
                                lead.temperatura
                              )}`}
                            >
                              {lead.temperatura || "frio"}
                            </span>

                            <span className="rounded-full border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400">
                              📎 {Array.isArray(lead.arquivos) ? lead.arquivos.length : 0}
                            </span>

                            <span className="rounded-full border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400">
                              🛡️ {Array.isArray(lead?.compliance?.evidencias) ? lead.compliance.evidencias.length : 0}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(lead)}
                            className="rounded-xl px-2 py-1 text-lg"
                            title="Favoritar lead"
                          >
                            {lead.favorito ? "⭐" : "☆"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="w-[360px] shrink-0 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/60 p-4">
            <div className="mb-4">
              <h4 className="font-semibold text-white">Nova coluna</h4>
              <p className="text-xs text-zinc-500">
                Coluna fantasma para criar estágio novo sem poluir o topo.
              </p>
            </div>

            <form onSubmit={handleCreateColumn} className="space-y-3">
              <input
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Ex: documentação pendente"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-500/20"
              >
                Criar coluna
              </button>
            </form>
          </div>
        </div>
      </section>

      <LeadModal
        open={showLeadModal}
        onClose={resetModalState}
        onSubmit={handleCreateOrUpdateLead}
        onDelete={handleDeleteLead}
        form={leadForm}
        setForm={setLeadForm}
        columns={columns}
        isEditing={!!editingLeadId}
      />
    </div>
  );
}

export default CRMPage;