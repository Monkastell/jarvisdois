// frontend/src/components/layout/AppLayout.jsx
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import MainSidebar from "../../pages/dashboard/layout/MainSidebar";
import ProfilePanel from "../../pages/dashboard/layout/ProfilePanel";

import AirMoreModal from "../../features/airmore/AirMoreModal";
import WhatsAppDisparoModal from "../../features/whatsapp/WhatsAppDisparoModal";
import DockerModal from "../../features/docker/DockerModal";

import { getEvolutionInstances } from "../../services/evolution";
import { jarvisBus } from "../../core/jarvis/eventBus";

const pageTitles = {
  "/": "Dashboard",
  "/conexoes-api": "Conexões",
  "/crm": "CRM",
  "/agents": "Agentes",
  "/prospeccao": "Prospecção",
};

function OperationalTopbar({ onOpenAirMore, onOpenEvolution, onOpenDocker }) {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || "Dashboard";

  const actionButtons = [
    { id: "conexao", label: "Conexão" },
    { id: "airmore", label: "Painel SMS" },
    { id: "evolution", label: "Painel Wapp" },
    { id: "docker", label: "Docker" },
  ];

  function handleAction(buttonId) {
    if (buttonId === "airmore") {
      onOpenAirMore();
      return;
    }

    if (buttonId === "evolution") {
      onOpenEvolution();
      return;
    }

    if (buttonId === "docker") {
      onOpenDocker();
      return;
    }

    console.log(`Botão clicado: ${buttonId}`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="px-4 py-4 md:px-6">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-400/80">
                JarvisDois
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                {currentTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Núcleo operacional da rota atual.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {actionButtons.map((button) => (
                <button
                  key={button.id}
                  onClick={() => handleAction(button.id)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white transition hover:border-sky-500 hover:bg-zinc-900"
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function RightSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [evolutionInstances, setEvolutionInstances] = useState([]);
  const [loadingEvolutionInstances, setLoadingEvolutionInstances] = useState(true);
  const [evolutionInstancesError, setEvolutionInstancesError] = useState("");

  async function loadInstances(showLoading = false) {
    try {
      if (showLoading) {
        setLoadingEvolutionInstances(true);
      }

      const instances = await getEvolutionInstances();
      setEvolutionInstances(Array.isArray(instances) ? instances : []);
      setEvolutionInstancesError("");
      
      // Emite evento via Jarvis
      jarvisBus.emit("evolution.instances.updated", {
        instances: instances,
        count: instances.length
      });
    } catch (error) {
      setEvolutionInstancesError(error.message || "Erro ao carregar instâncias.");
      jarvisBus.emit("evolution.instances.error", {
        error: error.message
      });
    } finally {
      if (showLoading) {
        setLoadingEvolutionInstances(false);
      }
    }
  }

  useEffect(() => {
    loadInstances(true);

    const interval = setInterval(() => {
      loadInstances(false);
    }, 10000);

    const handleInstancesUpdated = () => {
      loadInstances(false);
    };

    window.addEventListener("jarvis-instances-updated", handleInstancesUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("jarvis-instances-updated", handleInstancesUpdated);
    };
  }, []);

  const connectedInstances = evolutionInstances.filter((instance) =>
    ["open", "connected", "online"].includes(
      String(instance.status || "").toLowerCase()
    )
  );

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`sticky top-0 h-screen border-l border-zinc-800 bg-zinc-950 transition-all duration-300 ${
        expanded ? "w-[320px]" : "w-28"
      }`}
    >
      <div className="h-full overflow-hidden">
        <div className="h-full p-3">
          <div className="flex h-full flex-col gap-4">
            <div
              className={`transition-all duration-300 ${
                expanded ? "opacity-100" : "opacity-0 pointer-events-none h-0"
              }`}
            >
              <ProfilePanel />
            </div>

            {!expanded && (
              <div className="flex justify-center pt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-cyan-300">
                  ◎
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
              <div
                className={`mb-4 transition-all duration-300 ${
                  expanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                }`}
              >
                <h2 className="text-sm font-semibold text-white">
                  Instâncias ativas
                </h2>
                <p className="text-xs text-zinc-500">
                  Estado atual das conexões abertas no Evolution.
                </p>
              </div>

              <div className="space-y-3 overflow-y-auto">
                {loadingEvolutionInstances ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm text-zinc-400">
                      Atualizando instâncias...
                    </p>
                  </div>
                ) : evolutionInstancesError ? (
                  <div className="rounded-2xl border border-amber-700/40 bg-zinc-950 p-4">
                    <p className="text-sm text-amber-400">
                      Falha ao carregar instâncias.
                    </p>
                    {expanded && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {evolutionInstancesError}
                      </p>
                    )}
                  </div>
                ) : connectedInstances.length > 0 ? (
                  connectedInstances.map((instance) => {
                    const isOnline = ["open", "connected", "online"].includes(
                      String(instance.status || "").toLowerCase()
                    );

                    return (
                      <div
                        key={instance.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          isOnline
                            ? "bg-emerald-900/40 border-emerald-700"
                            : "bg-red-900/40 border-red-700"
                        }`}
                      >
                        {expanded ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {instance.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-zinc-200">
                                {instance.number || "Sem número identificado"}
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-800 bg-emerald-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                              {instance.status}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                isOnline ? "bg-emerald-400" : "bg-red-400"
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 p-4">
                    <p className="text-sm text-zinc-500">
                      {expanded
                        ? "Nenhuma instância ativa no momento."
                        : "—"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AppLayout() {
  const [openAirMore, setOpenAirMore] = useState(false);
  const [openEvolution, setOpenEvolution] = useState(false);
  const [openDocker, setOpenDocker] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="flex min-h-screen">
          <MainSidebar />

          <div className="flex min-w-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <OperationalTopbar
                onOpenAirMore={() => setOpenAirMore(true)}
                onOpenEvolution={() => setOpenEvolution(true)}
                onOpenDocker={() => setOpenDocker(true)}
              />

              <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
                <Outlet />
              </main>
            </div>

            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Modais - mantidos por compatibilidade mas sem uso principal */}
      <AirMoreModal open={openAirMore} onClose={() => setOpenAirMore(false)} />
      <WhatsAppDisparoModal open={openEvolution} onClose={() => setOpenEvolution(false)} />
      <DockerModal open={openDocker} onClose={() => setOpenDocker(false)} />
    </>
  );
}

export default AppLayout;