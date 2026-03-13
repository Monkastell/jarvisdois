function DashboardPage() {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Análise operacional
              </h2>
              <p className="text-sm text-zinc-500">
                Área reservada para dados reais do sistema
              </p>
            </div>

            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-500">
              vazio
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Leads
              </p>
              <div className="mt-4 h-40 rounded-2xl border border-zinc-800 bg-zinc-950" />
            </div>

            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Campanhas
              </p>
              <div className="mt-4 h-40 rounded-2xl border border-zinc-800 bg-zinc-950" />
            </div>

            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Atendimento
              </p>
              <div className="mt-4 h-40 rounded-2xl border border-zinc-800 bg-zinc-950" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              Estado do sistema
            </h2>
            <p className="text-sm text-zinc-500">
              Blocos reservados para monitoramento real
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Jarvis
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                Nenhum evento exibido no momento.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Agentes
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                Nenhum dado operacional carregado.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Integrações
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                Sem telemetria configurada.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Área futura de expansão
          </h2>
          <p className="text-sm text-zinc-500">
            Espaço reservado para funil, produtividade e leitura operacional.
          </p>
        </div>

        <div className="h-56 rounded-3xl border border-dashed border-zinc-700 bg-zinc-950" />
      </div>
    </section>
  );
}

export default DashboardPage;