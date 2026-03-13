class JarvisEventBus {
  constructor() {
    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 500;
    this.windowBridgeBound = false;
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(callback);
    return () => this.off(eventName, callback);
  }

  off(eventName, callback) {
    const set = this.listeners.get(eventName);
    if (!set) return;

    set.delete(callback);

    if (set.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit(eventName, payload = {}, meta = {}) {
    const event = {
      id: this.createEventId(),
      type: eventName,
      payload,
      meta: {
        source: meta.source || "unknown",
        module: meta.module || "unknown",
        createdAt: new Date().toISOString(),
        ...meta,
      },
    };

    this.history.unshift(event);

    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    const exactListeners = this.listeners.get(eventName);
    if (exactListeners) {
      exactListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`[JarvisBus] erro no listener "${eventName}"`, error);
        }
      });
    }

    const globalListeners = this.listeners.get("*");
    if (globalListeners) {
      globalListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error("[JarvisBus] erro no listener global", error);
        }
      });
    }

    window.dispatchEvent(
      new CustomEvent("jarvis:bus", {
        detail: event,
      })
    );

    return event;
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }

  bindWindowBridge() {
    if (this.windowBridgeBound) return;

    window.addEventListener("jarvis-airmore-event", this.handleLegacyWindowEvent);
    this.windowBridgeBound = true;
  }

  unbindWindowBridge() {
    if (!this.windowBridgeBound) return;

    window.removeEventListener("jarvis-airmore-event", this.handleLegacyWindowEvent);
    this.windowBridgeBound = false;
  }

  handleLegacyWindowEvent = (browserEvent) => {
    const detail = browserEvent?.detail || {};
    const type = detail?.type;

    if (!type) return;

    this.emit(type, detail.payload || {}, {
      source: detail?.payload?.source || "airmore",
      module: detail?.payload?.module || "airmore",
      bridge: "window.dispatchEvent",
      emittedAt: detail?.emittedAt || new Date().toISOString(),
    });
  };

  createEventId() {
    const rand = Math.random().toString(36).slice(2, 10);
    return `jarvis_${Date.now()}_${rand}`;
  }
}

export const jarvisBus = new JarvisEventBus();