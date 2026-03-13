// pages/dashboard/layout/MainSidebar.jsx
import { useState } from "react";
import { NavLink } from "react-router-dom";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "◫", path: "/dashboard" },
  { id: "conexoes-api", label: "Conexões", icon: "◎", path: "/conexoes-api" },
  { id: "crm", label: "CRM", icon: "▦", path: "/crm" },
  { id: "agents", label: "Agentes", icon: "◈", path: "/agents" },
  { id: "prospeccao", label: "Prospecção", icon: "✦", path: "/prospeccao" },
];

function MainSidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`sticky top-0 h-screen border-r border-zinc-800 bg-zinc-950 transition-all duration-300 ${
        expanded ? "w-70" : "w-26"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-15 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 text-lg font-bold text-cyan-300">
              J
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                expanded ? "w-auto opacity-100" : "w-0 opacity-0"
              }`}
            >
              <h1 className="text-sm font-bold tracking-[0.2em] text-white">
                JARVIS
              </h1>
              <p className="text-xs text-zinc-500">central operacional</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-cyan-500/20 bg-cyan-500/10 text-white"
                      : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-15 w-15 items-center justify-center rounded-xl text-sm ${
                        isActive
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-zinc-900"
                      }`}
                    >
                      {item.icon}
                    </span>

                    <span
                      className={`whitespace-nowrap transition-all duration-300 ${
                        expanded ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              ●
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                expanded ? "w-auto opacity-100" : "w-0 opacity-0"
              }`}
            >
              <p className="text-sm font-medium text-white">Sistema ativo</p>
              <p className="text-xs text-zinc-500">Estrutura base carregada</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default MainSidebar;