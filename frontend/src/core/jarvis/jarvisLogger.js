import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { jarvisBus } from "./eventBus";

let firestoreDb = null;
let alreadyStarted = false;
let unsubscribeGlobal = null;

export function setJarvisFirestore(db) {
  firestoreDb = db;
}

export function startJarvisOperationalLogging() {
  if (alreadyStarted) return;
  alreadyStarted = true;

  unsubscribeGlobal = jarvisBus.on("*", async (event) => {
    try {
      console.log("[JarvisLogger]", {
        id: event.id,
        type: event.type,
        payload: event.payload,
        meta: event.meta,
      });

      if (!firestoreDb) return;

      await addDoc(collection(firestoreDb, "jarvis_operational_logs"), {
        eventId: event.id,
        type: event.type,
        payload: sanitizeValue(event.payload),
        meta: sanitizeValue(event.meta),
        createdAtClient: event.meta?.createdAt || new Date().toISOString(),
        createdAtServer: serverTimestamp(),
      });
    } catch (error) {
      console.error("[JarvisLogger] erro ao persistir evento:", error);
    }
  });

  console.info("[JarvisLogger] logging operacional iniciado");
}

export function stopJarvisOperationalLogging() {
  if (unsubscribeGlobal) {
    unsubscribeGlobal();
    unsubscribeGlobal = null;
  }

  alreadyStarted = false;
}

function sanitizeValue(value) {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === "object") {
    const output = {};

    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "function") continue;
      if (item instanceof Date) {
        output[key] = item.toISOString();
        continue;
      }
      output[key] = sanitizeValue(item);
    }

    return output;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return String(value);
}