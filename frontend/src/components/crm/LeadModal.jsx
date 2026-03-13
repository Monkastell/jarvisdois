import { useEffect, useMemo, useState } from "react";

const tabs = [
  { id: "principal", label: "Principal" },
  { id: "pessoal", label: "Pessoal" },
  { id: "bancario", label: "Bancário" },
  { id: "acompanhamento", label: "Acompanhamento" },
  { id: "arquivos", label: "Arquivos" },
  { id: "compliance", label: "Compliance" },
];

function Input({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}

function LeadModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  form,
  setForm,
  columns = [],
  isEditing = false,
}) {
  const [activeTab, setActiveTab] = useState("principal");

  useEffect(() => {
    if (!open) return;

    function handleEsc(e) {
      if (e.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setActiveTab("principal");
  }, [open]);

  const safeForm = form || {};

  const markersValue = useMemo(() => {
    return Array.isArray(safeForm?.marcadores)
      ? safeForm.marcadores.join(", ")
      : "";
  }, [safeForm?.marcadores]);

  if (!open) return null;

  function updateField(field, value) {
    setForm((prev) => ({
      ...(prev || {}),
      [field]: value,
    }));
  }

  function updateComplianceField(field, value) {
    setForm((prev) => ({
      ...prev,
      compliance: {
        enabled: true,
        conversationCapture: true,
        status: "pendente",
        ultimaCapturaEm: "",
        observacoes: "",
        evidencias: [],
        ...(prev.compliance || {}),
        [field]: value,
      },
    }));
  }

  function removeAttachment(index) {
    setForm((prev) => ({
      ...prev,
      arquivos: (prev.arquivos || []).filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function handleFilesChange(event) {
    const selected = Array.from(event.target.files || []);
    setForm((prev) => ({
      ...prev,
      pendingFiles: [...(prev.pendingFiles || []), ...selected],
    }));
    event.target.value = "";
  }

  function handleComplianceFilesChange(event) {
    const selected = Array.from(event.target.files || []);
    setForm((prev) => ({
      ...prev,
      pendingComplianceFiles: [
        ...(prev.pendingComplianceFiles || []),
        ...selected,
      ],
    }));
    event.target.value = "";
  }

  function formatFileSize(size) {
    if (!size) return "0 KB";
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-6xl rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="border-b border-zinc-800 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">
                {isEditing ? "Editar lead" : "Novo lead"}
              </h3>
              <p className="text-sm text-zinc-400">
                Cadastro completo, tags, arquivos e trilha de compliance no mesmo grimório.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="border-b border-zinc-800 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-4 py-2 text-sm ${
                  activeTab === tab.id
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "bg-zinc-950 text-zinc-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[78vh] overflow-y-auto px-6 py-5"
        >
          {activeTab === "principal" && (
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Nome" value={form.nome} onChange={(v) => updateField("nome", v)} />
              <Input label="CPF" value={form.cpf} onChange={(v) => updateField("cpf", v)} />
              <Input label="Telefone" value={form.telefone} onChange={(v) => updateField("telefone", v)} />
              <Input label="E-mail" value={form.email} onChange={(v) => updateField("email", v)} />
              <Input label="Produto" value={form.produto} onChange={(v) => updateField("produto", v)} />
              <Input label="Matrícula" value={form.matricula} onChange={(v) => updateField("matricula", v)} />
              <Input label="Origem" value={form.origem} onChange={(v) => updateField("origem", v)} />
              <Input label="Valor" type="number" value={form.valor} onChange={(v) => updateField("valor", v)} />
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Status</label>
                <select
                  value={form.status || ""}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-500">Temperatura</label>
                <select
                  value={form.temperatura || "frio"}
                  onChange={(e) => updateField("temperatura", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                >
                  <option value="frio">frio</option>
                  <option value="morno">morno</option>
                  <option value="quente">quente</option>
                </select>
              </div>

              <Input label="Agente atual" value={form.agenteAtual} onChange={(v) => updateField("agenteAtual", v)} />
              <Input label="Estado da conversa" value={form.estadoConversa} onChange={(v) => updateField("estadoConversa", v)} />
            </div>
          )}

          {activeTab === "pessoal" && (
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Nascimento" value={form.nascimento} onChange={(v) => updateField("nascimento", v)} />
              <Input label="Naturalidade" value={form.naturalidade} onChange={(v) => updateField("naturalidade", v)} />
              <Input label="Estado" value={form.estado} onChange={(v) => updateField("estado", v)} />
              <Input label="Nacionalidade" value={form.nacionalidade} onChange={(v) => updateField("nacionalidade", v)} />
              <Input label="Estado civil" value={form.estadoCivil} onChange={(v) => updateField("estadoCivil", v)} />
              <Input label="Documento" value={form.documento} onChange={(v) => updateField("documento", v)} />
              <Input label="Órgão" value={form.orgao} onChange={(v) => updateField("orgao", v)} />
              <Input label="Data expedição" value={form.dataExpedicao} onChange={(v) => updateField("dataExpedicao", v)} />
              <Input label="Mãe" value={form.mae} onChange={(v) => updateField("mae", v)} />
              <Input label="Pai" value={form.pai} onChange={(v) => updateField("pai", v)} />
              <Input label="CEP" value={form.cep} onChange={(v) => updateField("cep", v)} />
              <Input label="Endereço" value={form.endereco} onChange={(v) => updateField("endereco", v)} />
              <Input label="Complemento" value={form.complemento} onChange={(v) => updateField("complemento", v)} />
              <Input label="Bairro" value={form.bairro} onChange={(v) => updateField("bairro", v)} />
              <Input label="Cidade" value={form.cidade} onChange={(v) => updateField("cidade", v)} />
              <Input label="UF" value={form.uf} onChange={(v) => updateField("uf", v)} />
            </div>
          )}

          {activeTab === "bancario" && (
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Banco código" value={form.bancoCodigo} onChange={(v) => updateField("bancoCodigo", v)} />
              <Input label="Agência" value={form.agencia} onChange={(v) => updateField("agencia", v)} />
              <Input label="Conta" value={form.conta} onChange={(v) => updateField("conta", v)} />
              <Input label="Dígito" value={form.digito} onChange={(v) => updateField("digito", v)} />
              <Input label="Tipo de conta" value={form.tipoConta} onChange={(v) => updateField("tipoConta", v)} />
              <Input label="PIX" value={form.pix} onChange={(v) => updateField("pix", v)} />
              <Input label="Senha contracheque" value={form.senhaContracheque} onChange={(v) => updateField("senhaContracheque", v)} />
              <Input label="Senha portal" value={form.senhaPortal} onChange={(v) => updateField("senhaPortal", v)} />
            </div>
          )}

          {activeTab === "acompanhamento" && (
            <div className="grid gap-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
                <label className="mb-2 block text-sm font-medium text-white">
                  Tags do lead
                </label>

                <p className="mb-3 text-xs text-zinc-500">
                  Digite separado por vírgula. Ex.: instagram, inss, retorno, documento-pendente
                </p>

                <input
                  type="text"
                  value={markersValue}
                  onChange={(e) =>
                    updateField(
                      "marcadores",
                      String(e.target.value || "")
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none"
                  placeholder="instagram, inss, retorno, documento-pendente"
                />

                {Array.isArray(safeForm?.marcadores) && safeForm.marcadores.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {safeForm.marcadores.map((marker, index) => (
                      <span
                        key={`${marker}-${index}`}
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-cyan-300"
                      >
                        #{marker}
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              "marcadores",
                              safeForm.marcadores.filter((_, currentIndex) => currentIndex !== index)
                            )
                          }
                          className="text-zinc-500 hover:text-red-300"
                          title="Remover tag"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-500">Observações</label>
                <textarea
                  rows="8"
                  value={safeForm?.obs || ""}
                  onChange={(e) => updateField("obs", e.target.value)}
                  className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                  placeholder="Anotações do atendimento..."
                />
              </div>
            </div>
          )}

          {activeTab === "arquivos" && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Arquivos do lead</h4>
                    <p className="text-sm text-zinc-500">
                      Aqui fica o cofre dos anexos. Agora com nome de campo consistente, para o JavaScript não tropeçar no próprio cadarço.
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-violet-500/15 px-4 py-3 text-sm text-violet-300 hover:bg-violet-500/20">
                    + Anexar arquivos
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFilesChange}
                    />
                  </label>
                </div>
              </div>

              {(form.arquivos || []).length === 0 && (form.pendingFiles || []).length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-10 text-center text-sm text-zinc-500">
                  Nenhum arquivo adicionado ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {(form.arquivos || []).map((arquivo, index) => (
                    <div
                      key={arquivo.id || `${arquivo.nome}-${index}`}
                      className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{arquivo.nome}</p>
                        <p className="text-xs text-zinc-500">
                          {arquivo.tipo || "arquivo"} • {formatFileSize(arquivo.tamanho)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="rounded-2xl bg-red-500/15 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
                      >
                        Remover
                      </button>
                    </div>
                  ))}

                  {(form.pendingFiles || []).map((arquivo, index) => (
                    <div
                      key={`${arquivo.name}-${index}-pending`}
                      className="flex flex-col gap-3 rounded-2xl border border-dashed border-cyan-700 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-cyan-300">{arquivo.name}</p>
                        <p className="text-xs text-zinc-500">
                          pendente de upload • {formatFileSize(arquivo.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "compliance" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 md:col-span-2">
                <h4 className="text-sm font-medium text-white">Backend de compliance</h4>
                <p className="mt-2 text-sm text-zinc-500">
                  Este bloco deixa o lead pronto para registrar evidências da conversa, capturas de tela e observações de segurança.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-500">Status do compliance</label>
                <select
                  value={form.compliance?.status || "pendente"}
                  onChange={(e) => updateComplianceField("status", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                >
                  <option value="pendente">pendente</option>
                  <option value="em_analise">em análise</option>
                  <option value="validado">validado</option>
                  <option value="bloqueado">bloqueado</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-500">Última captura em</label>
                <input
                  type="datetime-local"
                  value={form.compliance?.ultimaCapturaEm || ""}
                  onChange={(e) => updateComplianceField("ultimaCapturaEm", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <label className="flex items-center justify-between gap-3 text-sm text-white">
                  <span>Captura automática da conversa</span>
                  <input
                    type="checkbox"
                    checked={!!form.compliance?.conversationCapture}
                    onChange={(e) => updateComplianceField("conversationCapture", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <label className="flex items-center justify-between gap-3 text-sm text-white">
                  <span>Compliance ativo no lead</span>
                  <input
                    type="checkbox"
                    checked={!!form.compliance?.enabled}
                    onChange={(e) => updateComplianceField("enabled", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
                  />
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-zinc-500">Observações de segurança</label>
                <textarea
                  rows="6"
                  value={form.compliance?.observacoes || ""}
                  onChange={(e) => updateComplianceField("observacoes", e.target.value)}
                  className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none"
                  placeholder="Ex.: prints pendentes, conversa auditada, dados sensíveis confirmados pelo cliente..."
                />
              </div>

              <div className="md:col-span-2 rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Evidências de compliance</h4>
                    <p className="text-sm text-zinc-500">
                      Arquivos enviados para auditoria e registro.
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-500/20">
                    + Adicionar evidências
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleComplianceFilesChange}
                    />
                  </label>
                </div>
              </div>

              {Array.isArray(form.compliance?.evidencias) && form.compliance.evidencias.length > 0 && (
                <div className="md:col-span-2 space-y-3">
                  {form.compliance.evidencias.map((arquivo, index) => (
                    <div
                      key={`${arquivo.nome}-${index}`}
                      className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{arquivo.nome}</p>
                        <p className="text-xs text-zinc-500">
                          {arquivo.tipo || "arquivo"} • {formatFileSize(arquivo.tamanho)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(form.pendingComplianceFiles || []).length > 0 && (
                <div className="md:col-span-2 space-y-3">
                  {form.pendingComplianceFiles.map((arquivo, index) => (
                    <div
                      key={`${arquivo.name}-${index}-pending`}
                      className="flex flex-col gap-3 rounded-2xl border border-dashed border-emerald-700 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-emerald-300">{arquivo.name}</p>
                        <p className="text-xs text-zinc-500">
                          pendente de upload • {formatFileSize(arquivo.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-between gap-2 border-t border-zinc-800 pt-4">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-300 hover:bg-red-500/20"
                >
                  Excluir lead
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="rounded-2xl bg-cyan-500/15 px-4 py-3 text-sm text-cyan-300 hover:bg-cyan-500/20"
              >
                {isEditing ? "Salvar alterações" : "Salvar lead"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LeadModal;