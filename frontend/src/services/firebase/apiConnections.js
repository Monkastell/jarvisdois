import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";

const COLLECTION_NAME = "api_connections";

export async function listApiConnections() {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function createApiConnection(payload) {
  const nowPayload = {
    name: payload.name || "",
    program: payload.program || "custom",
    description: payload.description || "",
    environment: payload.environment || "local",
    isActive: payload.isActive ?? true,
    connectionType: Array.isArray(payload.connectionType)
      ? payload.connectionType
      : ["api"],

    apiConfig: {
      baseUrl: payload.apiConfig?.baseUrl || "",
      authType: payload.apiConfig?.authType || "none",
      apiKey: payload.apiConfig?.apiKey || "",
      defaultHeaders: payload.apiConfig?.defaultHeaders || "",
      testRoute: payload.apiConfig?.testRoute || "",
      timeoutMs: Number(payload.apiConfig?.timeoutMs || 10000),
    },

    webhookConfig: {
      enabled: payload.webhookConfig?.enabled ?? false,
      internalEndpoint: payload.webhookConfig?.internalEndpoint || "",
      externalWebhookUrl: payload.webhookConfig?.externalWebhookUrl || "",
      events: Array.isArray(payload.webhookConfig?.events)
        ? payload.webhookConfig.events
        : [],
      secret: payload.webhookConfig?.secret || "",
      validateOrigin: payload.webhookConfig?.validateOrigin ?? false,
    },

    operationalScript: {
      objective: payload.operationalScript?.objective || "",
      expectedFlow: payload.operationalScript?.expectedFlow || "",
      technicalNotes: payload.operationalScript?.technicalNotes || "",
    },

    status: {
      state: payload.status?.state || "configured",
      lastCheckedAt: payload.status?.lastCheckedAt || null,
      lastSuccessAt: payload.status?.lastSuccessAt || null,
      lastErrorAt: payload.status?.lastErrorAt || null,
      lastErrorMessage: payload.status?.lastErrorMessage || "",
      lastHttpStatus: payload.status?.lastHttpStatus || null,
      lastLatencyMs: payload.status?.lastLatencyMs || null,
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTION_NAME), nowPayload);

  return {
    id: ref.id,
    ...nowPayload,
  };
}

export async function updateApiConnection(id, payload) {
  const ref = doc(db, COLLECTION_NAME, id);

  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });

  return true;
}

export async function toggleApiConnection(id, isActive) {
  const ref = doc(db, COLLECTION_NAME, id);

  await updateDoc(ref, {
    isActive,
    "status.state": isActive ? "active" : "disabled",
    updatedAt: serverTimestamp(),
  });

  return true;
}

export async function deleteApiConnection(id) {
  const ref = doc(db, COLLECTION_NAME, id);
  await deleteDoc(ref);
  return true;
}

export async function markApiConnectionTesting(id) {
  const ref = doc(db, COLLECTION_NAME, id);

  await updateDoc(ref, {
    "status.state": "testing",
    "status.lastCheckedAt": new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });

  return true;
}

export async function markApiConnectionSuccess(id, payload = {}) {
  const ref = doc(db, COLLECTION_NAME, id);

  await updateDoc(ref, {
    "status.state": "active",
    "status.lastCheckedAt": new Date().toISOString(),
    "status.lastSuccessAt": new Date().toISOString(),
    "status.lastErrorMessage": "",
    "status.lastHttpStatus": payload.httpStatus ?? null,
    "status.lastLatencyMs": payload.latencyMs ?? null,
    updatedAt: serverTimestamp(),
  });

  return true;
}

export async function markApiConnectionError(id, payload = {}) {
  const ref = doc(db, COLLECTION_NAME, id);

  await updateDoc(ref, {
    "status.state": "error",
    "status.lastCheckedAt": new Date().toISOString(),
    "status.lastErrorAt": new Date().toISOString(),
    "status.lastErrorMessage": payload.errorMessage || "Erro desconhecido",
    "status.lastHttpStatus": payload.httpStatus ?? null,
    "status.lastLatencyMs": payload.latencyMs ?? null,
    updatedAt: serverTimestamp(),
  });

  return true;
}