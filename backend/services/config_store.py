import json
import os

CONFIG_FILE = "data/config.json"


DEFAULT_CONFIG = {
    "evolution_base_url": "http://localhost:8080",
    "evolution_api_key": "",
    "evolution_instance": "",
    "evolution_webhook_url": "http://localhost:8010/webhook/evolution",
    "gemini_api_key": "",
    "gemini_model": "gemini-2.5-flash"
}


def ensure_config_file():
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)


def load_config():
    ensure_config_file()
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return DEFAULT_CONFIG.copy()
            data = json.loads(content)
            merged = DEFAULT_CONFIG.copy()
            merged.update(data)
            return merged
    except Exception:
        return DEFAULT_CONFIG.copy()


def save_config(config: dict):
    ensure_config_file()
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)