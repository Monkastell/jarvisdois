// pages/auth/LoginPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginWithUsername,
  recoverPasswordByUsernameAndEmail,
  requestInitialAccess,
} from "../../services/firebase/auth";
import { useAuth } from "../../contexts/AuthContext";

function Input({ label, value, onChange, type = "text", placeholder = "", autoComplete = "off" }) {
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
  const { user, loading } = useAuth();

  const [tab, setTab] = useState("login");
  const [submitting, setSubmitting] = useState(false);
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

  // Efeito para redirecionar quando o usuário estiver logado
  useEffect(() => {
    if (!loading && user) {
      console.log("LoginPage: Usuário detectado, redirecionando para dashboard");
      
      // Tenta navigate primeiro
      try {
        navigate("/dashboard", { replace: true });
      } catch (err) {
        // Se falhar, usa window.location
        window.location.href = "/dashboard";
      }
    }
  }, [loading, user, navigate]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);

    try {
      const result = await loginWithUsername(username, senha);

      if (result.ok) {
        console.log("LoginPage: Login bem-sucedido, aguardando atualização do auth");
        
        // Verificação direta do Firebase Auth
        import("../../services/firebase/config").then(({ auth }) => {
          const currentUser = auth.currentUser;
          console.log("LoginPage: Verificação direta - usuário:", currentUser?.email);
          
          if (currentUser) {
            // Redirecionamento direto como fallback
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 500);
          }
        });
        
        return;
      }

      if (result.reason === "not_found") {
        setError("Usuário não encontrado.");
      } else if (result.reason === "auth_error") {
        setError("Senha inválida ou acesso não autorizado.");
      } else {
        setError("Não foi possível realizar o login.");
      }
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setError("Erro interno ao realizar login.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);

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
      } else if (result.reason === "not_found") {
        setError("Usuário não encontrado.");
      } else if (result.reason === "email_mismatch") {
        setError("O e-mail informado não corresponde ao usuário.");
      } else {
        setError("Não foi possível enviar a recuperação de senha.");
      }
    } catch (err) {
      console.error("Erro ao recuperar senha:", err);
      setError("Erro interno ao recuperar senha.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);

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
      } else {
        setError("Não foi possível enviar a solicitação.");
      }
    } catch (err) {
      console.error("Erro ao solicitar acesso:", err);
      setError("Erro interno ao solicitar acesso.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900 shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-gradient-to-br from-cyan-500/20 via-zinc-900 to-zinc-950 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">
              JarvisDois
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white">
              Dashboard operacional
              <br />
              da FinComex
            </h1>
            <p className="mt-6 max-w-md text-base text-zinc-300">
              Centralize CRM, campanhas, agentes e operações em um único núcleo.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
            <p className="text-sm text-zinc-400">
              Acesso seguro com autenticação integrada ao Firebase.
            </p>
          </div>
        </section>

        <section className="p-6 md:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-semibold text-white">Acessar</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Entre com seu usuário e senha para abrir o painel.
              </p>
            </div>

            <div className="mb-6 flex rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setTab("login");
                }}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  tab === "login"
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setTab("recover");
                }}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
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
                  resetMessages();
                  setTab("request");
                }}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
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
                  disabled={submitting}
                  className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Entrando..." : "Entrar"}
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
                  disabled={submitting}
                  className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Enviando..." : "Recuperar senha"}
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
                  disabled={submitting}
                  className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Enviando..." : "Solicitar acesso"}
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