import { useState } from "react";

export default function DockerModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("containers");
  const [statusMessage, setStatusMessage] = useState("");

  // Placeholder para dados simulados
  const [containers, setContainers] = useState([
    { id: "1", name: "evolution-api", status: "running", image: "evolution/api:latest" },
    { id: "2", name: "redis-cache", status: "running", image: "redis:alpine" },
    { id: "3", name: "postgres-db", status: "exited", image: "postgres:15" },
  ]);

  function handleContainerAction(containerId, action) {
    setStatusMessage(`Ação "${action}" no container ${containerId} simulada.`);
    // Aqui futuramente será feita a chamada real para o backend do Docker
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div className="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold">Docker · Gerenciamento de Containers</h2>
            <p className="text-sm text-zinc-400">
              Visualize e gerencie containers, imagens e volumes do ambiente.
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
          {["containers", "images", "networks", "volumes"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-2xl px-5 py-3 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-cyan-500/15 text-cyan-300"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "containers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Containers</h3>
                <button className="rounded-2xl bg-emerald-500/15 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20">
                  + Novo Container
                </button>
              </div>

              <div className="grid gap-3">
                {containers.map((container) => (
                  <div
                    key={container.id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-semibold text-white">
                          {container.name}
                        </h4>
                        <p className="text-sm text-zinc-400">{container.image}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            container.status === "running"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-rose-500/10 text-rose-300"
                          }`}
                        >
                          {container.status}
                        </span>

                        <button
                          onClick={() =>
                            handleContainerAction(
                              container.id,
                              container.status === "running" ? "stop" : "start"
                            )
                          }
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
                        >
                          {container.status === "running" ? "Parar" : "Iniciar"}
                        </button>

                        <button
                          onClick={() => handleContainerAction(container.id, "restart")}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
                        >
                          Reiniciar
                        </button>

                        <button
                          onClick={() => handleContainerAction(container.id, "logs")}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
                        >
                          Logs
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {containers.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950 p-8 text-center text-zinc-500">
                    Nenhum container em execução.
                  </div>
                )}
              </div>

              {statusMessage && (
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                  {statusMessage}
                </div>
              )}
            </div>
          )}

          {/* Placeholders para outras abas */}
          {activeTab !== "containers" && (
            <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950 p-10 text-center text-zinc-500">
              Interface de gerenciamento de <span className="font-semibold text-cyan-300">{activeTab}</span> em desenvolvimento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}