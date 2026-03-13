import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

function getInitials(name = "", email = "") {
  const source = name || email || "U";
  const parts = source.trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function ProfilePanel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [brandName, setBrandName] = useState(
    localStorage.getItem("jarvis_brand_name") || "JARVIS"
  );
  const [accent, setAccent] = useState(
    localStorage.getItem("jarvis_brand_accent") || "cyan"
  );
  const [showBrand, setShowBrand] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const email = user?.email || "-";
  const photoUrl = user?.photoURL || "";

  const initials = useMemo(
    () => getInitials(displayName, email),
    [displayName, email]
  );

  async function handleLogout() {
    try {
      setIsLeaving(true);
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erro ao sair:", error);
      alert(error.message || "Erro ao sair da conta.");
    } finally {
      setIsLeaving(false);
    }
  }

  const accentClasses = {
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
    pink: "bg-pink-500/15 text-pink-300 border-pink-500/20",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/20",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  };

    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full border text-sm font-bold ${
              accentClasses[accent]
            }`}
          >
            {initials}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">
            {displayName}
          </h3>
          <p className="truncate text-xs text-zinc-500">{email}</p>
          <p className="mt-1 text-[11px] text-zinc-600">Perfil autenticado</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowBrand((prev) => !prev)}
          className="rounded-2xl bg-zinc-950 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Perfil
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLeaving}
          className="rounded-2xl bg-red-500/15 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-60"
        >
          {isLeaving ? "Saindo..." : "Sair"}
        </button>
      </div>

      {showBrand && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Whitelabel
          </p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Nome do sistema
              </label>
              <input
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  localStorage.setItem("jarvis_brand_name", e.target.value);
                }}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
                placeholder="Nome do sistema"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-zinc-500">
                Cor principal
              </label>

              <div className="grid grid-cols-4 gap-2">
                {["cyan", "pink", "violet", "emerald"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setAccent(color);
                      localStorage.setItem("jarvis_brand_accent", color);
                    }}
                    className={`rounded-2xl border px-2 py-2 text-xs capitalize ${
                      accent === color
                        ? accentClasses[color]
                        : "border-zinc-800 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500">Prévia</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {brandName || "JARVIS"}
              </p>
              <p className="text-xs text-zinc-400">
                Branding salvo localmente por enquanto.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePanel;