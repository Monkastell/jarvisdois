import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginWithUsername,
  recoverPasswordByUsernameAndEmail,
  requestInitialAccess,
} from "../../services/firebase/auth";

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  autoComplete = "off",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/40"
      />
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");

  const [recoverUsername, setRecoverUsername] = useState("");
  const [recoverEmail, setRecoverEmail] = useState("");

  const [accessNome, setAccessNome] = useState("");
  const [accessCpf, setAccessCpf] = useState("");
  const [accessEmail, setAccessEmail] = useState("");
  const [accessTelefone, setAccessTelefone] = useState("");

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const result = await loginWithUsername(username, senha);

      if (result.ok) {
        navigate("/", { replace: true });
        return;
      }

      if (result.reason === "not_found") {
        setError("Usuário não encontrado.");
        return;
      }

      if (result.reason === "auth_error") {
        setError("Senha inválida ou acesso não autorizado.");
        return;
      }

      setError("Não foi possível realizar o login.");
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setError("Erro interno ao realizar login.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const result = await recoverPasswordByUsernameAndEmail(
        recoverUsername,
        recoverEmail
      );

      if (result.ok) {
        setSuccess("E-mail de recuperação enviado com sucesso.");
        return;
      }

      if (result.reason === "missing_fields") {
        setError("Preencha usuário e e-mail.");
        return;
      }

      if (result.reason === "not_found") {
        setError("Usuário não encontrado.");
        return;
      }

      if (result.reason === "email_mismatch") {
        setError("O e-mail informado não corresponde ao usuário.");
        return;
      }

      setError("Não foi possível enviar a recuperação de senha.");
    } catch (err) {
      console.error("Erro ao recuperar senha:", err);
      setError("Erro interno ao recuperar senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const result = await requestInitialAccess({
        nome: accessNome,
        cpf: accessCpf,
        email: accessEmail,
        telefone: accessTelefone,
      });

      if (result.ok) {
        setSuccess("Solicitação enviada com sucesso.");
        setAccessNome("");
        setAccessCpf("");
        setAccessEmail("");
        setAccessTelefone("");
        return;
      }

      if (result.reason === "missing_fields") {
        setError("Preencha todos os campos para solicitar acesso.");
        return;
      }

      setError("Não foi possível enviar a solicitação.");
    } catch (err) {
      console.error("Erro ao solicitar acesso:", err);
      setError("Erro interno ao solicitar acesso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900 shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden min-h-[720px] overflow-hidden border-r border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-cyan-950/30 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-400/80">
              JarvisDois
            </p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight text-white">
              Núcleo operacional para CRM, campanhas, agentes e automação.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-zinc-400">
              Um painel central para coordenar fluxo de leads, comunicação e
              inteligência operacional. Sem fumaça, sem holograma fake, só base
              sólida para crescer.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Módulos-base
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  "CRM",
                  "WhatsApp",
                  "SMS",
                  "Agentes IA",
                  "Campanhas",
                  "Dashboard",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Estado atual
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                Login por username + Firebase Auth, dashboard inicial e base
                pronta para evolução do núcleo.
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 md:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-400/80">
                JarvisDois
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Acesso</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Entre com seu usuário para acessar o núcleo operacional.
              </p>
            </div>

            <div className="mb-6 grid grid-cols-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  resetMessages();
                }}
                className={`rounded-2xl px-3 py-2 text-sm transition ${
                  tab === "login"
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("recover");
                  resetMessages();
                }}
                className={`rounded-2xl px-3 py-2 text-sm transition ${
                  tab === "recover"
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Recuperar
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("request");
                  resetMessages();
                }}
                className={`rounded-2xl px-3 py-2 text-sm transition ${
                  tab === "request"
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Solicitar
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            ) : null}

            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Usuário"
                  value={username}
                  onChange={setUsername}
                  placeholder="Digite seu username"
                  autoComplete="username"
                />

                <Input
                  label="Senha"
                  type="password"
                  value={senha}
                  onChange={setSenha}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            )}

            {tab === "recover" && (
              <form onSubmit={handleRecover} className="space-y-4">
                <Input
                  label="Usuário"
                  value={recoverUsername}
                  onChange={setRecoverUsername}
                  placeholder="Digite seu username"
                />

                <Input
                  label="E-mail"
                  type="email"
                  value={recoverEmail}
                  onChange={setRecoverEmail}
                  placeholder="Digite o e-mail vinculado"
                  autoComplete="email"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Enviando..." : "Recuperar senha"}
                </button>
              </form>
            )}

            {tab === "request" && (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <Input
                  label="Nome"
                  value={accessNome}
                  onChange={setAccessNome}
                  placeholder="Digite seu nome"
                />

                <Input
                  label="CPF"
                  value={accessCpf}
                  onChange={setAccessCpf}
                  placeholder="Digite seu CPF"
                />

                <Input
                  label="E-mail"
                  type="email"
                  value={accessEmail}
                  onChange={setAccessEmail}
                  placeholder="Digite seu e-mail"
                  autoComplete="email"
                />

                <Input
                  label="Telefone"
                  value={accessTelefone}
                  onChange={setAccessTelefone}
                  placeholder="Digite seu telefone"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Enviando..." : "Solicitar acesso"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;