import { auth, db } from "./config";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

console.log("Projeto Firebase:", auth.app.options.projectId);

function normalizeText(value = "") {
  return String(value).trim();
}

async function findUserByUsername(username) {
  const usernameLimpo = normalizeText(username);

  if (!usernameLimpo) return null;

  const qParceiro = query(
    collection(db, "parceiros"),
    where("username", "==", usernameLimpo)
  );
  const snapParceiro = await getDocs(qParceiro);

  if (!snapParceiro.empty) {
    const doc = snapParceiro.docs[0];
    return {
      tipo: "parceiro",
      id: doc.id,
      ...doc.data(),
    };
  }

  const qAdmin = query(
    collection(db, "admin"),
    where("username", "==", usernameLimpo)
  );
  const snapAdmin = await getDocs(qAdmin);

  if (!snapAdmin.empty) {
    const doc = snapAdmin.docs[0];
    return {
      tipo: "admin",
      id: doc.id,
      ...doc.data(),
    };
  }

  return null;
}

export async function loginWithUsername(username, senha) {
  console.log("loginWithUsername chamado com:", username);

  const usernameLimpo = normalizeText(username);
  console.log("username limpo:", usernameLimpo);

  const userDoc = await findUserByUsername(usernameLimpo);
  console.log("userDoc encontrado:", userDoc);

  if (!userDoc?.email) {
    return { ok: false, reason: "not_found" };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      userDoc.email,
      senha
    );

    console.log("login auth ok:", userCredential.user?.email);

    return {
      ok: true,
      user: userCredential.user,
      profile: userDoc,
    };
  } catch (error) {
    console.error("erro no auth:", error);
    return {
      ok: false,
      reason: "auth_error",
      code: error.code,
      message: error.message,
    };
  }
}

export async function recoverPasswordByUsernameAndEmail(username, emailInformado) {
  const usernameLimpo = normalizeText(username);
  const emailLimpo = normalizeText(emailInformado).toLowerCase();

  if (!usernameLimpo || !emailLimpo) {
    return { ok: false, reason: "missing_fields" };
  }

  const userDoc = await findUserByUsername(usernameLimpo);

  if (!userDoc?.email) {
    return { ok: false, reason: "not_found" };
  }

  const emailFirestore = String(userDoc.email).trim().toLowerCase();

  if (emailFirestore !== emailLimpo) {
    return { ok: false, reason: "email_mismatch" };
  }

  await sendPasswordResetEmail(auth, emailFirestore);
  return { ok: true };
}

export async function requestInitialAccess(payload) {
  const nome = normalizeText(payload.nome);
  const cpf = normalizeText(payload.cpf);
  const email = normalizeText(payload.email).toLowerCase();
  const telefone = normalizeText(payload.telefone);

  if (!nome || !cpf || !email || !telefone) {
    return { ok: false, reason: "missing_fields" };
  }

  await addDoc(collection(db, "solicitacoes_acesso"), {
    nome,
    cpf,
    email,
    telefone,
    status: "novo",
    origem: "login_react",
    createdAt: Date.now(),
  });

  return { ok: true };
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function logoutUser() {
  await signOut(auth);
}